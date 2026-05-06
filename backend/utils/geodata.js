// backend/utils/geodata.js

/**
 * Predefined geospatial coordinates for major Hyderabad areas
 * Used to simulate live map hotspots without an external geocoding API
 */
const areaCoordinates = {
    "LB Nagar": { lat: 17.3457, lng: 78.5522 },
    "Banjara Hills": { lat: 17.4126, lng: 78.4482 },
    "Ameerpet": { lat: 17.4375, lng: 78.4483 },
    "Secunderabad": { lat: 17.4399, lng: 78.4983 },
    "Jubilee Hills": { lat: 17.4239, lng: 78.4738 }
};

/**
 * Returns coordinates for a given area name
 */
exports.getCoords = (areaName) => {
    return areaCoordinates[areaName] || null;
};

/**
 * Returns all mapped areas
 */
exports.getAllAreas = () => Object.keys(areaCoordinates);
