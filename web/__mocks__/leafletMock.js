module.exports = {
  map: jest.fn(() => ({ addTo: jest.fn(), remove: jest.fn() })),
  tileLayer: jest.fn(() => ({ addTo: jest.fn() })),
  marker: jest.fn(() => ({ addTo: jest.fn(), bindPopup: jest.fn(), remove: jest.fn() })),
  icon: jest.fn(() => ({})),
  latLng: jest.fn((lat, lng) => ({ lat, lng })),
  circle: jest.fn(() => ({ addTo: jest.fn(), remove: jest.fn() })),
  heat: jest.fn(() => ({ addTo: jest.fn(), setLatLngs: jest.fn(), remove: jest.fn() })),
};
