import { calculateDistance, validateLocation } from "./location"

describe("calculateDistance", () => {
  it("returns 0 for the same point", () => {
    const distance = calculateDistance(
      { latitude: -6.2, longitude: 106.8 },
      { latitude: -6.2, longitude: 106.8 }
    )
    expect(distance).toBe(0)
  })

  it("calculates distance between two known points", () => {
    // Monas (Jakarta) to HI Roundabout ~2.5 km
    const distance = calculateDistance(
      { latitude: -6.1754, longitude: 106.8272 },
      { latitude: -6.1952, longitude: 106.8227 }
    )
    expect(distance).toBeGreaterThan(2000)
    expect(distance).toBeLessThan(3000)
  })

  it("throws for invalid input", () => {
    expect(() => calculateDistance(
      null as never,
      { latitude: 0, longitude: 0 }
    )).toThrow("Invalid location parameters")
  })
})

describe("validateLocation", () => {
  it("returns true when within geofence", () => {
    const result = validateLocation(
      { latitude: -6.2, longitude: 106.8, accuracy: 5, timestamp: new Date() },
      { center: { latitude: -6.2, longitude: 106.8 }, radius: 100, tolerance: 10 }
    )
    expect(result).toBe(true)
  })

  it("returns false when outside geofence", () => {
    const result = validateLocation(
      { latitude: -6.3, longitude: 106.9, accuracy: 5, timestamp: new Date() },
      { center: { latitude: -6.2, longitude: 106.8 }, radius: 100, tolerance: 10 }
    )
    expect(result).toBe(false)
  })

  it("returns false when accuracy exceeds tolerance", () => {
    const result = validateLocation(
      { latitude: -6.2, longitude: 106.8, accuracy: 50, timestamp: new Date() },
      { center: { latitude: -6.2, longitude: 106.8 }, radius: 100, tolerance: 10 }
    )
    expect(result).toBe(false)
  })

  it("returns false for null config", () => {
    const result = validateLocation(
      { latitude: 0, longitude: 0, accuracy: 5, timestamp: new Date() },
      null as never
    )
    expect(result).toBe(false)
  })
})
