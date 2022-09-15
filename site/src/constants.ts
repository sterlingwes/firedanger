export enum DangerRating {
  Low = 0,
  Moderate = 1,
  High = 2,
  VeryHigh = 3,
  Extreme = 4,
}

export const dangerColours = Object.freeze({
  [DangerRating.Low]: {
    stroke: "hsla(235, 92%, 53%, 1)",
    fill: "hsla(235, 92%, 53%, 0.5)",
  },
  [DangerRating.Moderate]: {
    stroke: "hsla(266, 92%, 53%, 1)",
    fill: "hsla(266, 92%, 53%, 0.5)",
  },
  [DangerRating.High]: {
    stroke: "hsla(297, 92%, 53%, 1)",
    fill: "hsla(297, 92%, 53%, 0.5)",
  },
  [DangerRating.VeryHigh]: {
    stroke: "hsla(328, 92%, 53%, 1)",
    fill: "hsla(328, 92%, 53%, 0.5)",
  },
  [DangerRating.Extreme]: {
    stroke: "hsla(359, 92%, 53%, 1)",
    fill: "hsla(359, 92%, 53%, 0.5)",
  },
});

export const dangerLabel = Object.freeze({
  [DangerRating.Low]: "Low",
  [DangerRating.Moderate]: "Moderate",
  [DangerRating.High]: "High",
  [DangerRating.VeryHigh]: "Very High",
  [DangerRating.Extreme]: "Extreme",
});
