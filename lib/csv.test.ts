import { convertToCSV } from "./csv"

describe("convertToCSV", () => {
  it("uses the first row's keys as the header", () => {
    expect(convertToCSV([{ Nama: "Budi", Jam: 8 }])).toBe("Nama,Jam\nBudi,8")
  })

  it("returns an empty string for no rows", () => {
    expect(convertToCSV([])).toBe("")
  })

  it("writes the given headers even when there are no rows", () => {
    expect(convertToCSV([], ["Tanggal", "Nama"])).toBe("Tanggal,Nama")
  })

  it("quotes fields containing commas, quotes or newlines and doubles inner quotes", () => {
    const csv = convertToCSV([
      { Catatan: 'Rapat "penting", lanjut', Alamat: "Jl. A\nJakarta" },
    ])

    expect(csv).toBe('Catatan,Alamat\n"Rapat ""penting"", lanjut","Jl. A\nJakarta"')
  })

  it("renders null and undefined as empty fields", () => {
    expect(convertToCSV([{ a: null, b: undefined, c: 0 }])).toBe("a,b,c\n,,0")
  })

  it.each(["=HYPERLINK(\"http://x\")", "+1+1", "-2+3", "@SUM(A1)", "\tcmd", "\rcmd"])(
    "neutralises spreadsheet formula text %j so Excel shows it as text",
    (value) => {
      const [, row] = convertToCSV([{ Catatan: value }]).split("\n")
      const unquoted = row.startsWith('"') ? row.slice(1) : row

      expect(unquoted.startsWith("'")).toBe(true)
    },
  )

  it("leaves real numbers alone, including negatives", () => {
    expect(convertToCSV([{ lat: -6.2088, jam: 8.5 }])).toBe("lat,jam\n-6.2088,8.5")
  })
})
