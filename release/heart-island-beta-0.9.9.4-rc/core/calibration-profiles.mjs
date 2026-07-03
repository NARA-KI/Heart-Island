// ============================================
// 心岛计划 — 评分机制校准方案 (Beta 0.9.1)
// ============================================
// Each profile overrides algorithm params and/or personality data.
// Fields not specified fall back to baseline values from scoring.mjs.

// ═══════════════════════════════════════════════
// LIVE PROFILE — determines which calibration is
// active in the production page (app.js) and the
// default matchAllTypes() in core/scoring.mjs.
//
// When you change this, also update:
//   1. core/scoring.mjs LIVE_PARAMS block
//   2. app.js matchAllTypes() comment block
// ═══════════════════════════════════════════════
export const LIVE_SCORING_PROFILE = 'calibrationB';

export const SCORING_PROFILES = {

  // =========================================================
  // BASELINE — current live config
  // =========================================================
  baseline: {
    algorithmParams: {
      coreWeight: 1.80,
      metBonus: 1.5,
      failPenalty: 4.5
    },
    personalityOverrides: {}  // no overrides — uses scoring.mjs defaults
  },

  // =========================================================
  // PROFILE A: Light Calibration
  // =========================================================
  // Goals:
  //  - Reduce 守门人/候鸟 from ~15% to ~11-12%
  //  - Boost 极光 from 0.1% to ~1%, 温室 from 1% to ~2%
  //  - Keep algorithm structure unchanged
  //
  // Changes:
  //  1. 守门人: Push moderate dims away from random mean (50)
  //     Lower CL/SE/CA/ME so profile is more "polarized"
  //  2. 候鸟: Same — push moderate dims away from 50
  //  3. 极光: Loosen thresholds (NV:85→78, ID:80→72, IN:75→68)
  //  4. 温室: Loosen SE:85→78, CL:80→72
  //  5. 深海: Loosen EV:75→68, ID:75→68
  // =========================================================
  calibrationA: {
    algorithmParams: {
      coreWeight: 1.80,
      metBonus: 1.5,
      failPenalty: 4.5
    },
    personalityOverrides: {
      // 守门人型: push moderate dims away from 50 (Beta 0.9.8.1: AU→84, ST→84)
      gatekeeper: {
        targetVector: {CL:45,AU:84,SE:42,EX:35,RP:65,IN:30,ID:45,ST:84,CA:48,NV:25,ME:42,EV:45},
        coreThresholds: {AU:78,ST:68,EX_MAX:42}
      },
      // 候鸟型: push moderate dims away from 50 (Beta 0.9.8.1: AU→84, NV→84)
      migratory_bird: {
        targetVector: {CL:60,AU:84,SE:50,EX:52,RP:35,IN:65,ID:58,ST:28,NV:84,CA:35,ME:55,EV:72},
        coreThresholds: {AU:72,NV:68,ST_MAX:42}
      },
      // 极光型: loosen thresholds
      aurora: {
        targetVector: {CL:60,AU:82,SE:40,EX:82,RP:45,IN:85,ID:85,ST:25,NV:90,CA:30,ME:35,EV:65},
        coreThresholds: {NV:78,ID:72,IN:68}
      },
      // 温室型: loosen thresholds
      greenhouse: {
        targetVector: {CL:85,AU:25,SE:90,EX:68,RP:45,IN:35,ID:65,ST:82,CA:55,NV:18,ME:55,EV:85},
        coreThresholds: {SE:78,CL:72,AU_MAX:45}
      },
      // 深海型: loosen thresholds
      deep_sea: {
        targetVector: {CL:60,AU:72,SE:58,EX:25,RP:55,IN:22,ID:78,ST:70,CA:45,NV:25,ME:65,EV:85},
        coreThresholds: {EV:68,EX_MAX:42,ID:68}
      }
    }
  },

  // =========================================================
  // PROFILE B: Medium Calibration
  // =========================================================
  // Goals:
  //  - 守门人/候鸟 → ~9-11%
  //  - 极光 → ~2%, 温室 → ~3%
  //  - gap ≤ 5 → 60-65%
  //
  // Changes:
  //  1. All targetVector adjustments from Profile A
  //  2. coreWeight: 1.80 → 2.20 (more differentiation)
  //  3. failPenalty: 4.5 → 6.0 (harsher for missing core traits)
  //  4. metBonus: 1.5 → 2.0
  //  5. Additional threshold tightening for top types
  // =========================================================
  calibrationB: {
    algorithmParams: {
      coreWeight: 2.20,
      metBonus: 2.0,
      failPenalty: 6.0
    },
    personalityOverrides: {
      // 守门人型 (Beta 0.9.8.1: AU→84, ST→84 for golden path fix)
      gatekeeper: {
        targetVector: {CL:45,AU:84,SE:42,EX:35,RP:65,IN:30,ID:45,ST:84,CA:48,NV:25,ME:42,EV:45},
        coreThresholds: {AU:78,ST:68,EX_MAX:42}
      },
      // 候鸟型 (Beta 0.9.8.1: AU→84, NV→84 for golden path fix)
      migratory_bird: {
        targetVector: {CL:60,AU:84,SE:50,EX:52,RP:35,IN:65,ID:58,ST:28,NV:84,CA:35,ME:55,EV:72},
        coreThresholds: {AU:72,NV:68,ST_MAX:42}
      },
      // 极光型 (loosen more since algorithm is stricter)
      // B+ fix: ST_MAX:38 differentiates from 探险家型 (both high NV/IN)
      aurora: {
        targetVector: {CL:60,AU:82,SE:40,EX:82,RP:45,IN:82,ID:82,ST:25,NV:88,CA:30,ME:35,EV:65},
        coreThresholds: {NV:75,ID:70,IN:65,ST_MAX:38}
      },
      // 温室型
      greenhouse: {
        targetVector: {CL:82,AU:28,SE:88,EX:68,RP:45,IN:35,ID:65,ST:82,CA:55,NV:18,ME:55,EV:85},
        coreThresholds: {SE:75,CL:70,AU_MAX:48}
      },
      // 深海型
      deep_sea: {
        targetVector: {CL:60,AU:72,SE:58,EX:25,RP:55,IN:22,ID:75,ST:70,CA:45,NV:25,ME:65,EV:82},
        coreThresholds: {EV:65,EX_MAX:45,ID:65}
      },
      // Also add a 3rd threshold to镜像型 to reduce its pull (currently 8.9%)
      mirror: {
        targetVector: {CL:72,AU:35,SE:68,EX:58,RP:48,IN:38,ID:62,ST:60,CA:68,NV:25,ME:50,EV:90},
        coreThresholds: {EV:82,CA:58,AU_MAX:48}
      },
      // Slightly tighten月光型 (currently 8.0%)
      moonlight: {
        targetVector: {CL:78,AU:38,SE:60,EX:70,RP:65,IN:45,ID:80,ST:70,CA:62,NV:35,ME:55,EV:72},
        coreThresholds: {ID:78,CA:58,EV:62}
      },
      // B+ fix: Raise NV threshold so aurora-type users (NV:88) fail it,
      // breaking the 99-99 tie. Explorer self-match still passes (NV:95 >= 90).
      explorer: {
        targetVector: {CL:55,AU:78,SE:35,EX:68,RP:50,IN:84,ID:60,ST:22,NV:95,CA:30,ME:25,EV:45},
        coreThresholds: {NV:90,IN:75,ST_MAX:40}
      }
    }
  },

  // =========================================================
  // PROFILE C: Differentiation Enhancement
  // =========================================================
  // Goals:
  //  - 守门人/候鸟 → ~8-10%
  //  - All types 1-12%
  //  - gap ≤ 5 → 50-60%
  //
  // Changes:
  //  1. All targetVector adjustments from Profile B
  //  2. coreWeight: 2.50 (strong differentiation)
  //  3. failPenalty: 8.0 (severe penalty for missing core traits)
  //  4. metBonus: 3.0 (strong reward for hitting core traits)
  //  5. Add "anti-pattern" soft penalty: if a type has _MAX on a dim
  //     and user scores very high there, apply extra penalty
  // =========================================================
  calibrationC: {
    algorithmParams: {
      coreWeight: 2.50,
      metBonus: 3.0,
      failPenalty: 8.0,
      antiPatternPenalty: 2.0  // extra penalty when user violates _MAX expectations
    },
    personalityOverrides: {
      // Same vectors as B (Beta 0.9.8.1: AU→84, ST→84)
      gatekeeper: {
        targetVector: {CL:45,AU:84,SE:42,EX:35,RP:65,IN:30,ID:45,ST:84,CA:48,NV:25,ME:42,EV:45},
        coreThresholds: {AU:78,ST:68,EX_MAX:42}
      },
      migratory_bird: {
        targetVector: {CL:60,AU:84,SE:50,EX:52,RP:35,IN:65,ID:58,ST:28,NV:84,CA:35,ME:55,EV:72},
        coreThresholds: {AU:72,NV:68,ST_MAX:42}
      },
      aurora: {
        targetVector: {CL:60,AU:82,SE:40,EX:82,RP:45,IN:82,ID:82,ST:25,NV:88,CA:30,ME:35,EV:65},
        coreThresholds: {NV:72,ID:68,IN:62}
      },
      greenhouse: {
        targetVector: {CL:82,AU:28,SE:88,EX:68,RP:45,IN:35,ID:65,ST:82,CA:55,NV:18,ME:55,EV:85},
        coreThresholds: {SE:72,CL:68,AU_MAX:50}
      },
      deep_sea: {
        targetVector: {CL:60,AU:72,SE:58,EX:25,RP:55,IN:22,ID:75,ST:70,CA:45,NV:25,ME:65,EV:82},
        coreThresholds: {EV:62,EX_MAX:48,ID:62}
      },
      mirror: {
        targetVector: {CL:72,AU:35,SE:68,EX:58,RP:48,IN:38,ID:62,ST:60,CA:68,NV:25,ME:50,EV:90},
        coreThresholds: {EV:82,CA:58,AU_MAX:48}
      },
      moonlight: {
        targetVector: {CL:78,AU:38,SE:60,EX:70,RP:65,IN:45,ID:80,ST:70,CA:62,NV:35,ME:55,EV:72},
        coreThresholds: {ID:78,CA:58,EV:62}
      },
      // Further tighten 岛屿型 to reduce its pull
      island: {
        targetVector: {CL:28,AU:94,SE:25,EX:25,RP:50,IN:28,ID:30,ST:45,CA:22,NV:35,ME:25,EV:25},
        coreThresholds: {AU:88,CL_MAX:38,EX_MAX:32}
      }
    }
  }
};
