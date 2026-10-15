/** Presentation labels preserve source sector keys used by filters and valuations. */
export function sectorLabel(sector: string): string {
  return sector.toLocaleLowerCase("pt-BR") === "intermediários financeiros"
    ? "Bancos, Holdings e Seguradoras"
    : sector;
}