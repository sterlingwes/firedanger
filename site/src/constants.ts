export enum DangerRating {
  Low = 0,
  Moderate = 1,
  High = 2,
  VeryHigh = 3,
  Extreme = 4,
}

export const dangerColours = Object.freeze({
  [DangerRating.Low]: {
    stroke: "#0000ff",
    fill: "#0000ff80",
  },
  [DangerRating.Moderate]: {
    stroke: "#00E300",
    fill: "#00E30080",
  },
  [DangerRating.High]: {
    stroke: "#ffff00",
    fill: "#ffff0080",
  },
  [DangerRating.VeryHigh]: {
    stroke: "#cc9900",
    fill: "#cc990080",
  },
  [DangerRating.Extreme]: {
    stroke: "#ff0000",
    fill: "#ff000080",
  },
});

export const dangerLabel = Object.freeze({
  [DangerRating.Low]: "Low",
  [DangerRating.Moderate]: "Moderate",
  [DangerRating.High]: "High",
  [DangerRating.VeryHigh]: "Very High",
  [DangerRating.Extreme]: "Extreme",
});
