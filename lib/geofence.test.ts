import { validateGeofence, getGeofenceConfig } from "./geofence"

jest.mock("@/lib/prisma", () => ({
  prisma: {
    systemSettings: {
      findFirst: jest.fn(),
    },
  },
}))

import { prisma } from "@/lib/prisma"

const mockedFindFirst = prisma.systemSettings.findFirst as jest.Mock

describe("getGeofenceConfig", () => {
  afterEach(() => jest.clearAllMocks())

  it("returns null center when no settings exist", async () => {
    mockedFindFirst.mockResolvedValue(null)
    const config = await getGeofenceConfig()
    expect(config.center).toBeNull()
    expect(config.requireLocation).toBe(true)
  })

  it("reads office coordinates from settings", async () => {
    mockedFindFirst.mockResolvedValue({
      location: {
        officeLatitude: -6.2,
        officeLongitude: 106.8,
        geofenceRadius: 150,
        requireLocation: true,
      },
    })
    const config = await getGeofenceConfig()
    expect(config.center).toEqual({ latitude: -6.2, longitude: 106.8 })
    expect(config.radius).toBe(150)
  })

  it("parses string coordinates (e.g. from JSON text)", async () => {
    mockedFindFirst.mockResolvedValue({
      location: {
        officeLatitude: "-6.2",
        officeLongitude: "106.8",
      },
    })
    const config = await getGeofenceConfig()
    expect(config.center).toEqual({ latitude: -6.2, longitude: 106.8 })
  })

  it("treats requireLocation=false as opt-out", async () => {
    mockedFindFirst.mockResolvedValue({
      location: { requireLocation: false },
    })
    const config = await getGeofenceConfig()
    expect(config.requireLocation).toBe(false)
    expect(config.center).toBeNull()
  })
})

describe("validateGeofence", () => {
  afterEach(() => jest.clearAllMocks())

  it("returns withinGeofence=null when no office configured and requireLocation is false", async () => {
    mockedFindFirst.mockResolvedValue({ location: { requireLocation: false } })
    const result = await validateGeofence({
      latitude: 0,
      longitude: 0,
      accuracy: 5,
      timestamp: new Date(),
    })
    expect(result.withinGeofence).toBeNull()
    expect(result.distance).toBeNull()
  })

  it("throws 500 when requireLocation=true but no office is configured", async () => {
    mockedFindFirst.mockResolvedValue(null)
    await expect(
      validateGeofence({ latitude: 0, longitude: 0, accuracy: 5, timestamp: new Date() })
    ).rejects.toMatchObject({ status: 500 })
  })

  it("returns withinGeofence=true when user is at the office", async () => {
    mockedFindFirst.mockResolvedValue({
      location: {
        officeLatitude: -6.2,
        officeLongitude: 106.8,
        geofenceRadius: 100,
        requireLocation: true,
      },
    })
    const result = await validateGeofence({
      latitude: -6.2,
      longitude: 106.8,
      accuracy: 5,
      timestamp: new Date(),
    })
    expect(result.withinGeofence).toBe(true)
    expect(result.distance).toBe(0)
  })

  it("returns withinGeofence=false when user is outside radius", async () => {
    mockedFindFirst.mockResolvedValue({
      location: {
        officeLatitude: -6.2,
        officeLongitude: 106.8,
        geofenceRadius: 100,
        requireLocation: true,
      },
    })
    const result = await validateGeofence({
      latitude: -6.21,
      longitude: 106.81,
      accuracy: 5,
      timestamp: new Date(),
    })
    expect(result.withinGeofence).toBe(false)
    expect(result.distance).toBeGreaterThan(100)
  })

  it("adds GPS accuracy to the effective radius", async () => {
    mockedFindFirst.mockResolvedValue({
      location: {
        officeLatitude: -6.2,
        officeLongitude: 106.8,
        geofenceRadius: 100,
        requireLocation: true,
      },
    })
    // 90m from office but 50m accuracy → effective radius is 150m, should pass.
    // We pick a point ~90m from (-6.2, 106.8). Approx 1m at this lat = 0.00001 lat.
    const result = await validateGeofence({
      latitude: -6.2008,
      longitude: 106.8,
      accuracy: 50,
      timestamp: new Date(),
    })
    expect(result.distance).toBeLessThan(100)
    expect(result.withinGeofence).toBe(true)
  })
})
