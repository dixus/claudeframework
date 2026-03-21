export interface CoordinationModel {
  teamSize: number;
  traditionalCost: number;
  aiEnabledCost: number;
  aiNativeCost: number;
  companyCost: number;
}

const TEAM_SIZES = [10, 25, 50, 100, 200, 500];

function rawTraditional(n: number): number {
  return (n * (n - 1)) / 2;
}

function rawAIEnabled(n: number): number {
  return n * Math.log2(n);
}

function rawAINative(n: number): number {
  return n * 1.5;
}

function normalize(value: number, max: number): number {
  return (value / max) * 100;
}

function interpolateCompanyCost(
  traditional: number,
  aiEnabled: number,
  aiNative: number,
  theta: number,
): number {
  if (theta < 20) return traditional;
  if (theta <= 50) {
    const t = (theta - 20) / 30;
    return traditional * (1 - t) + aiEnabled * t;
  }
  if (theta <= 80) return aiEnabled;
  const t = (theta - 80) / 20;
  return aiEnabled * (1 - t) + aiNative * t;
}

export function computeCoordinationCurves(
  teamSize: number,
  theta: number,
): CoordinationModel[] {
  const maxN = TEAM_SIZES[TEAM_SIZES.length - 1];
  const maxTraditional = rawTraditional(maxN);

  const sizes = TEAM_SIZES.includes(teamSize)
    ? TEAM_SIZES
    : [...TEAM_SIZES, teamSize].sort((a, b) => a - b);

  return sizes.map((n) => {
    const trad = normalize(rawTraditional(n), maxTraditional);
    const aiEn = normalize(rawAIEnabled(n), maxTraditional);
    const aiNat = normalize(rawAINative(n), maxTraditional);
    const company = interpolateCompanyCost(trad, aiEn, aiNat, theta);

    return {
      teamSize: n,
      traditionalCost: trad,
      aiEnabledCost: aiEn,
      aiNativeCost: aiNat,
      companyCost: company,
    };
  });
}

export function getCoordinationInsight(
  theta: number,
  teamSize: number,
): { text: string; savings: number } {
  const maxN = 500;
  const maxTraditional = rawTraditional(maxN);

  const tradCost = normalize(rawTraditional(teamSize), maxTraditional);
  const aiEnCost = normalize(rawAIEnabled(teamSize), maxTraditional);
  const aiNatCost = normalize(rawAINative(teamSize), maxTraditional);
  const companyCost = interpolateCompanyCost(
    tradCost,
    aiEnCost,
    aiNatCost,
    theta,
  );

  const savings = tradCost > 0 ? 1 - companyCost / tradCost : 0;
  const savingsPercent = Math.round(savings * 100);

  const text =
    `At your team size of ${teamSize}, your AI maturity saves ~${savingsPercent}% coordination overhead vs traditional. ` +
    (theta < 50
      ? "Increasing AI adoption could significantly reduce coordination costs."
      : "Your AI integration is effectively reducing communication overhead.");

  return { text, savings };
}
