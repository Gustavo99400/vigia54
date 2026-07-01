import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
// import { ImageAnnotatorClient } from "@google-cloud/vision"; // Requires billing
import { GoogleGenerativeAI } from "@google/generative-ai";

admin.initializeApp();
const db = admin.firestore();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const revision_ia = functions.firestore
  .document("incidentes/{incidenteId}")
  .onCreate(async (snap, context) => {
    const incidente = snap.data();
    const { incidenteId } = context.params;

    functions.logger.info(`Iniciando revisión IA para incidente: ${incidenteId}`);

    let iaScore = 0.5; // Base score
    let estado = "verificado";
    let prioridad = incidente.prioridad || 3;

    try {
      // 1. Análisis de Imagen (Cloud Vision) — Requires billing, kept simulated
      if (incidente.evidencia?.fotoUrl) {
        functions.logger.info("Foto detectada — incrementando score base");
        iaScore += 0.2; // Having photo evidence raises confidence
      }

      // 2. Análisis de Texto REAL (NLP con Gemini)
      if (incidente.descripcion) {
        functions.logger.info("Analizando texto con Gemini AI...");

        try {
          const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
          const prompt = `Analiza este reporte de incidente de seguridad ciudadana en Arequipa, Perú: "${incidente.descripcion}". 
          
          Responde ÚNICAMENTE con un JSON válido (sin markdown, sin backticks) con esta estructura exacta:
          {
            "is_spam": boolean,
            "urgency_score": número del 1 al 10,
            "keywords": ["palabra1", "palabra2"],
            "category_suggestion": "robo_mano_armada" | "vandalismo" | "sospechoso" | "accidente"
          }`;

          const result = await model.generateContent(prompt);
          const responseText = result.response.text();
          
          // Clean response (remove possible markdown backticks)
          const cleanJson = responseText
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();
          
          const analysis = JSON.parse(cleanJson);
          
          functions.logger.info("Resultado Gemini:", analysis);

          if (analysis.is_spam) {
            estado = "falsa_alarma";
            iaScore = 0.1;
            functions.logger.info("Reporte clasificado como SPAM");
          } else if (analysis.urgency_score > 7) {
            prioridad = 1;
            iaScore += 0.3;
            functions.logger.info(`Alta urgencia detectada: ${analysis.urgency_score}/10`);
          } else if (analysis.urgency_score > 4) {
            prioridad = 2;
            iaScore += 0.15;
          }

          // Store AI analysis in the document
          await snap.ref.update({
            "metadata.ia_analysis": analysis,
            "metadata.ia_keywords": analysis.keywords || [],
          });

        } catch (aiError) {
          functions.logger.error("Error en Gemini, fallback a análisis básico:", aiError);
          
          // Fallback: basic keyword analysis
          const desc = incidente.descripcion.toLowerCase();
          if (desc.includes("arma") || desc.includes("herido") || desc.includes("sangre") || desc.includes("disparo")) {
            prioridad = 1;
            iaScore = 0.95;
          } else if (desc.includes("robo") || desc.includes("asalto") || desc.includes("golpe")) {
            prioridad = 2;
            iaScore = 0.7;
          }
        }
      }

      // 3. Cálculo final y actualización
      iaScore = Math.min(1.0, iaScore);

      // Check user Trust Score
      const userRef = db.collection("usuarios").doc(incidente.usuarioId);
      const userDoc = await userRef.get();
      const trustScore = userDoc.exists ? userDoc.data()?.trust_score : 50;

      if (trustScore < 30 && iaScore < 0.6) {
        estado = "revision_manual";
      }

      // Update the incident
      await snap.ref.update({
        estado,
        prioridad,
        "evidencia.ia_score": iaScore,
        "metadata.fecha_revision_ia": admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update user report count
      if (userDoc.exists) {
        await userRef.update({
          reportes_total: admin.firestore.FieldValue.increment(1),
        });
      }

      functions.logger.info(
        `Incidente ${incidenteId} procesado. Estado: ${estado}, Prioridad: ${prioridad}, IA Score: ${iaScore}`
      );

    } catch (error) {
      functions.logger.error("Error en el pipeline de IA:", error);
      await snap.ref.update({ estado: "revision_manual" });
    }
  });
