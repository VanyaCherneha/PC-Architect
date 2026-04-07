/**
 * PC Architect — Compatibility Checker Utilities
 * Real-time compatibility validation for PC builds.
 */

const SCENARIOS = {
  office: { budget: 600, requirements: { minRAM: 16, minCores: 4 } },
  gaming: { budget: 1500, requirements: { minVRAM: 8, minGPU: 'mid' } },
  workstation: { budget: 2500, requirements: { minRAM: 32, minCores: 8 } },
};

/**
 * Check if the CPU socket matches the mainboard socket.
 */
export function checkSocketMatch(cpu, mainboard) {
  if (!cpu || !mainboard) return true; // no conflict if one is missing
  return cpu.socket === mainboard.socket;
}

/**
 * Check if the Cooler supports the CPU socket.
 */
export function checkCoolerSocket(cpu, cooler) {
  if (!cpu || !cooler) return true;
  if (!cooler.supportedSockets) return true;
  return cooler.supportedSockets.includes(cpu.socket);
}

/**
 * Check if the RAM type matches the mainboard's supported RAM type.
 */
export function checkRamType(ram, mainboard) {
  if (!ram || !mainboard) return true;
  return ram.ramType === mainboard.ramType;
}

/**
 * Check if the PSU provides enough wattage for all selected components.
 */
export function checkPowerSufficiency(components, psu) {
  if (!psu) return true; // can't check without a PSU
  const totalTDP = Object.values(components).reduce((sum, c) => {
    if (!c || c.category === 'PSU') return sum;
    return sum + (c.tdp || 0);
  }, 0);
  // Add a 20% headroom recommendation
  return psu.wattage >= totalTDP * 1.2;
}

/**
 * Check if the cooler's TDP rating is sufficient for the CPU.
 */
export function checkCoolerSufficiency(cpu, cooler) {
  if (!cpu || !cooler) return true;
  if (!cooler.coolerTdpRating) return true; // Fallback if property is missing
  return cooler.coolerTdpRating >= cpu.tdp;
}

/**
 * Dimensions & Case Checks
 */
export function checkCaseDimensions(build, tr) {
  const pcCase = build.Case;
  if (!pcCase) return null;

  const errors = [];
  const mb = build.Mainboard;
  const gpu = build.GPU;
  const cooler = build.Cooler;

  const translate = tr || ((key, opts) => {
    const templates = {
      'compat.caseMbMismatch': `Case mismatch: ${opts?.pcCase} does not support ${opts?.formFactor} motherboards.`,
      'compat.gpuTooLong': `GPU too long: ${opts?.gpu} is ${opts?.gpuLength}mm, but ${opts?.pcCase} only supports up to ${opts?.maxLength}mm.`,
      'compat.coolerTooTall': `Cooler too tall: ${opts?.cooler} is ${opts?.coolerHeight}mm, but ${opts?.pcCase} only supports up to ${opts?.maxHeight}mm.`,
    };
    return templates[key] || key;
  });

  if (mb && pcCase.supportedMB && !pcCase.supportedMB.includes(mb.formFactor)) {
    errors.push(translate('compat.caseMbMismatch', { pcCase: pcCase.name, formFactor: mb.formFactor }));
  }

  if (gpu && gpu.length > pcCase.maxGpuLength) {
    errors.push(translate('compat.gpuTooLong', { gpu: gpu.name, gpuLength: gpu.length, pcCase: pcCase.name, maxLength: pcCase.maxGpuLength }));
  }

  if (cooler && cooler.height > pcCase.maxCoolerHeight) {
    errors.push(translate('compat.coolerTooTall', { cooler: cooler.name, coolerHeight: cooler.height, pcCase: pcCase.name, maxHeight: pcCase.maxCoolerHeight }));
  }

  return errors;
}


/**
 * Get overall compatibility status for the current build.
 * Returns { isCompatible: bool, errors: string[], warnings: string[] }
 */
export function getCompatibilityStatus(build, t) {
  const errors = [];
  const warnings = [];

  const cpu = build.CPU;
  const mainboard = build.Mainboard;
  const ram = build.RAM;
  const psu = build.PSU;
  const cooler = build.Cooler;

  const tr = t || ((key, opts) => {
    const templates = {
      'compat.socketMismatch': `Socket mismatch: ${opts?.cpu} (${opts?.cpuSocket}) is not compatible with ${opts?.mb} (${opts?.mbSocket})`,
      'compat.coolerMount': `Cooler mounting issue: ${opts?.cooler} does not include brackets for ${opts?.socket} socket`,
      'compat.noDisplay': `No Display Output: ${opts?.cpu} does not have integrated graphics. You must add a dedicated GPU.`,
      'compat.ramTypeMismatch': `RAM type mismatch: ${opts?.ram} (${opts?.ramType}) does not match ${opts?.mb} (${opts?.mbRamType})`,
      'compat.cpuRamMismatch': `CPU/RAM mismatch: ${opts?.cpu} supports ${opts?.cpuRamType} but ${opts?.ram} is ${opts?.ramType}`,
      'compat.insufficientCooling': `Insufficient cooling: ${opts?.cooler} is rated for ${opts?.coolerTdp}W, but ${opts?.cpu} has a TDP of ${opts?.cpuTdp}W`,
      'compat.insufficientPsu': `Insufficient PSU: ${opts?.psu} (${opts?.psuWattage}W) may not handle peak draw of ${opts?.draw}W (TDP: ${opts?.tdp}W)`,
      'compat.bottleneckCpuOverGpu': `Tip from Walter: The powerful ${opts?.cpu} is severely bottlenecked by the ${opts?.gpuTier}-tier ${opts?.gpu}.`,
      'compat.bottleneckGpuOverCpu': `Tip from Walter: The powerful ${opts?.gpu} is held back by the ${opts?.cpuTier}-tier ${opts?.cpu}.`,
      'compat.caseMbMismatch': `Case mismatch: ${opts?.pcCase} does not support ${opts?.formFactor} motherboards.`,
      'compat.gpuTooLong': `GPU too long: ${opts?.gpu} is ${opts?.gpuLength}mm, but ${opts?.pcCase} only supports up to ${opts?.maxLength}mm.`,
      'compat.coolerTooTall': `Cooler too tall: ${opts?.cooler} is ${opts?.coolerHeight}mm, but ${opts?.pcCase} only supports up to ${opts?.maxHeight}mm.`,
    };
    return templates[key] || key;
  });

  if (cpu && mainboard && !checkSocketMatch(cpu, mainboard)) {
    errors.push(
      tr('compat.socketMismatch', { cpu: cpu.name, cpuSocket: cpu.socket, mb: mainboard.name, mbSocket: mainboard.socket })
    );
  }

  if (cpu && cooler && !checkCoolerSocket(cpu, cooler)) {
    errors.push(
      tr('compat.coolerMount', { cooler: cooler.name, socket: cpu.socket })
    );
  }

  if (cpu && build.GPU === undefined) {
    if (cpu.hasIGPU === false) {
      errors.push(tr('compat.noDisplay', { cpu: cpu.name }));
    }
  }

  if (ram && mainboard && !checkRamType(ram, mainboard)) {
    errors.push(
      tr('compat.ramTypeMismatch', { ram: ram.name, ramType: ram.ramType, mb: mainboard.name, mbRamType: mainboard.ramType })
    );
  }

  if (cpu && ram && cpu.ramType && ram.ramType && cpu.ramType !== ram.ramType) {
    errors.push(
      tr('compat.cpuRamMismatch', { cpu: cpu.name, cpuRamType: cpu.ramType, ram: ram.name, ramType: ram.ramType })
    );
  }

  if (cpu && cooler && !checkCoolerSufficiency(cpu, cooler)) {
    errors.push(
      tr('compat.insufficientCooling', { cooler: cooler.name, coolerTdp: cooler.coolerTdpRating, cpu: cpu.name, cpuTdp: cpu.tdp })
    );
  }

  if (psu && !checkPowerSufficiency(build, psu)) {
    const totalTDP = Object.values(build).reduce((sum, c) => {
      if (!c || c.category === 'PSU') return sum;
      return sum + (c.tdp || 0);
    }, 0);
    const estimatedDraw = Math.ceil(totalTDP * 0.75);
    errors.push(
      tr('compat.insufficientPsu', { psu: psu.name, psuWattage: psu.wattage, draw: estimatedDraw, tdp: totalTDP })
    );
  }

  if (cpu && build.GPU) {
    const highEndCpu = cpu.performanceClass === 'ultra' || cpu.performanceClass === 'high';
    const lowEndGpu = build.GPU.performanceClass === 'low' || build.GPU.performanceClass === 'mid';
    if (highEndCpu && lowEndGpu) {
      warnings.push(
        tr('compat.bottleneckCpuOverGpu', { cpu: cpu.name, gpuTier: build.GPU.performanceClass, gpu: build.GPU.name })
      );
    }
    const highEndGpu = build.GPU.performanceClass === 'ultra' || build.GPU.performanceClass === 'high';
    const lowEndCpu = cpu.performanceClass === 'low' || cpu.performanceClass === 'mid';
    if (highEndGpu && lowEndCpu) {
      warnings.push(
        tr('compat.bottleneckGpuOverCpu', { gpu: build.GPU.name, cpuTier: cpu.performanceClass, cpu: cpu.name })
      );
    }
  }

  const dimensionErrors = checkCaseDimensions(build, tr);
  if (dimensionErrors && dimensionErrors.length > 0) {
    errors.push(...dimensionErrors);
  }

  return {
    isCompatible: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Calculate a build score from 0–100 based on the scenario requirements,
 * compatibility, budget usage, and component completeness.
 */
export function calculateScore(build, scenarioKey, options = {}) {
  const scenario = SCENARIOS[scenarioKey];
  if (!scenario) return { score: 0, maxAllowed: 100 };

  let score = 0;

  // --- Basic build state ---
  const hasCpu = !!build.CPU;
  const hasRam = !!build.RAM;
  const hasMainboard = !!build.Mainboard;
  const hasPsu = !!build.PSU;
  const hasStorage = !!build.SSD;
  const hasGpuOrDisplay =
    !!build.GPU || (build.CPU && build.CPU.hasIGPU === true);

  const buildCanBoot =
    hasCpu && hasRam && hasMainboard && hasPsu && hasStorage && hasGpuOrDisplay;

  // If time ran out and the build cannot even boot, this is a hard fail.
  if (options.ranOutOfTime && !buildCanBoot) {
    return { score: 0, maxAllowed: 30 };
  }

  // --- Completeness (30 pts) ---
  const requiredCategories = ['CPU', 'GPU', 'RAM', 'Mainboard', 'PSU', 'SSD', 'Cooler', 'Case'];

  // Custom completeness calc because GPU isn't STRICTLY required if CPU has iGPU
  let expectedCategories = [...requiredCategories];
  if (build.CPU && build.CPU.hasIGPU === true && !build.GPU) {
    expectedCategories = expectedCategories.filter(cat => cat !== 'GPU');
  }

  const filledCount = expectedCategories.filter((cat) => build[cat]).length;
  score += (filledCount / expectedCategories.length) * 30;

  // --- Compatibility (30 pts) ---
  const { isCompatible, errors } = getCompatibilityStatus(build);
  if (isCompatible) {
    score += 30;
  }

  // --- Budget (20 pts) ---
  const totalSpent = Object.values(build).reduce((sum, c) => (c ? sum + c.price : sum), 0);
  if (buildCanBoot && totalSpent <= scenario.budget) {
    // Reward using 70-100% of budget only if the PC can actually boot
    const usage = totalSpent / scenario.budget;
    if (usage >= 0.7) {
      score += 20;
    } else {
      score += usage * 20;
    }
  }

  // --- Performance match (20 pts) ---
  const perfMap = { low: 1, mid: 2, high: 3, ultra: 4 };
  const scenarioPerfLevel = scenarioKey === 'office' ? 1 : scenarioKey === 'gaming' ? 2 : 3;

  if (buildCanBoot) {
    const componentPerfs = Object.values(build)
      .filter((c) => c && c.performanceClass)
      .map((c) => perfMap[c.performanceClass] || 1);

    if (componentPerfs.length > 0) {
      const avgPerf = componentPerfs.reduce((a, b) => a + b, 0) / componentPerfs.length;
      // Reward matching (or slightly above) the scenario level
      const diff = Math.abs(avgPerf - scenarioPerfLevel);
      if (diff <= 0.5) {
        score += 20;
      } else if (diff <= 1) {
        score += 12;
      } else {
        score += 5;
      }
    }
  }

  // --- STRICT RULES APPLY HERE ---
  // 5. If total cost exceeds budget -> deduct points based on how much over
  if (totalSpent > scenario.budget) {
    const overBudget = totalSpent - scenario.budget;
    const percentageOver = overBudget / scenario.budget;
    score -= percentageOver * 100; // E.g. 10% over -> -10 points
  }

  // 6. If compatibility issues exist -> each issue deducts 15 points minimum
  if (errors && errors.length > 0) {
    score -= errors.length * 15;
  }

  // 4. If RAM is 16GB and mission is Gaming or Workstation → deduct 10 points
  const ramIs16GB = build.RAM && typeof build.RAM.name === 'string' && build.RAM.name.includes('16 GB');
  if (ramIs16GB && (scenarioKey === 'gaming' || scenarioKey === 'workstation')) {
    score -= 10;
  }

  let maxAllowed = 100;

  const totalTdp = Object.values(build).reduce((sum, c) => (c && c.category !== 'PSU' ? sum + (c.tdp || 0) : sum), 0);
  const psuWattage = build.PSU ? build.PSU.wattage : 0;
  const psuHeadroom = build.PSU ? psuWattage - totalTdp : 0;

  // 1. If PSU headroom (psu.wattage - totalTdp) < 100W → score MAX 55
  if (build.PSU && psuHeadroom < 100 && psuHeadroom >= 0) {
    maxAllowed = Math.min(maxAllowed, 55);
  }

  // 2. If PSU headroom < 0W → score MAX 30
  if (build.PSU && psuHeadroom < 0) {
    maxAllowed = Math.min(maxAllowed, 30);
  }

  // 3. If CPU has no iGPU and no GPU selected → score MAX 20
  if (build.CPU && build.CPU.hasIGPU === false && !build.GPU) {
    maxAllowed = Math.min(maxAllowed, 20);
  }

  if (build.CPU && build.GPU) {
    const highEndCpu = build.CPU.performanceClass === 'ultra' || build.CPU.performanceClass === 'high';
    const lowEndGpu = build.GPU.performanceClass === 'low' || build.GPU.performanceClass === 'mid';
    if (highEndCpu && lowEndGpu) {
      score -= 15;
      maxAllowed = Math.min(maxAllowed, 85);
    }
    const highEndGpu = build.GPU.performanceClass === 'ultra' || build.GPU.performanceClass === 'high';
    const lowEndCpu = build.CPU.performanceClass === 'low' || build.CPU.performanceClass === 'mid';
    if (highEndGpu && lowEndCpu) {
      score -= 15;
      maxAllowed = Math.min(maxAllowed, 85);
    }
  }

  score = Math.round(Math.min(maxAllowed, Math.max(0, score)));

  return { score, maxAllowed };
}

export { SCENARIOS };
