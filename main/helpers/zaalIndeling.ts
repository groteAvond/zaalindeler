export interface ZaalIndeling {
  rijen: {
    [key: number]: {
      stoelen: any[];
      maxStoelen: number;
      rolstoelPlek?: string[];
      balkon?: boolean;
      ereLidStoelen?: any[];
    };
  };
}

export const zaalIndeling: ZaalIndeling = {
  rijen: {
    0: {
      stoelen: [],
      maxStoelen: 19,
      ereLidStoelen: [],
    },
    1: {
      stoelen: [],
      maxStoelen: 24,
      ereLidStoelen: [],
    },
    2: {
      stoelen: [],
      maxStoelen: 27,
      ereLidStoelen: [],
    },
    3: {
      stoelen: [],
      maxStoelen: 30,
      ereLidStoelen: [],
    },
    4: { stoelen: [], maxStoelen: 31, ereLidStoelen: [] },
    5: { stoelen: [], maxStoelen: 32, ereLidStoelen: [] },
    6: { stoelen: [], maxStoelen: 35, ereLidStoelen: [] },
    7: { stoelen: [], maxStoelen: 36, ereLidStoelen: [] },
    8: { stoelen: [], maxStoelen: 37, ereLidStoelen: [] },
    9: { stoelen: [], maxStoelen: 38, ereLidStoelen: [] },
    10: { stoelen: [], maxStoelen: 13, ereLidStoelen: [] },
    11: { stoelen: [], maxStoelen: 13, ereLidStoelen: [] },
    12: { stoelen: [], maxStoelen: 13, ereLidStoelen: [] },
    13: { stoelen: [], maxStoelen: 13, ereLidStoelen: [] },
    14: {
      stoelen: [],
      maxStoelen: 12,
      rolstoelPlek: ["2 stoelen voor 1 rolstoel"],
      ereLidStoelen: [],
    },
    15: { stoelen: [], maxStoelen: 12, ereLidStoelen: [] },
    16: { stoelen: [], maxStoelen: 38, balkon: true, ereLidStoelen: [] },
    17: { stoelen: [], maxStoelen: 39, balkon: true, ereLidStoelen: [] },
    18: { stoelen: [], maxStoelen: 39, balkon: true, ereLidStoelen: [] },
    19: { stoelen: [], maxStoelen: 39, balkon: true, ereLidStoelen: [] },
    20: { stoelen: [], maxStoelen: 39, balkon: true, ereLidStoelen: [] },
    21: { stoelen: [], maxStoelen: 39, balkon: true, ereLidStoelen: [] },
  },
};
