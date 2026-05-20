export type DestinationSeasonalityLinkage = {
  peakSeasonPrograms: number;
  offSeasonPrograms: number;
  missingWindows: string[];
  seasonalityScore: number;
};

export function summarizeSeasonality(programWindows: string[]): DestinationSeasonalityLinkage {
  const normalized = programWindows.map((x) => String(x || '').trim()).filter(Boolean);
  const peak = normalized.filter((x) => /(peak|summer|winter|holiday|ramadan|festival)/i.test(x)).length;
  const off = normalized.filter((x) => /(off|shoulder|weekday|midseason)/i.test(x)).length;
  const expected = ['peak', 'off'];
  const missingWindows = expected.filter((key) => !normalized.some((w) => w.toLowerCase().includes(key)));
  const seasonalityScore = Math.min(100, peak * 25 + off * 25 + (missingWindows.length === 0 ? 50 : 0));
  return {
    peakSeasonPrograms: peak,
    offSeasonPrograms: off,
    missingWindows,
    seasonalityScore,
  };
}
