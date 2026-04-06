export interface Fish {
    id: string;
    name: string;
    cost: number;
    size: number;
    bioLoad: number;
    color: string;
    shape: string;
    desc: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    targetVx: number;
    targetVy: number;
    swimCycle: number;
    health: number;
    isDead: boolean;
    hunger: number;
    targetY: number | null;
    tilt?: number;
}

export interface Plant {
    id: string;
    name: string;
    cost: number;
    maxH: number;
    leaves: number;
    color: string;
    shape: string;
    nAbsorb: number;
    desc: string;
    x: number;
    height: number;
}

export interface Slot {
    type: string;
    dirt: number;
}

export interface PipelineNode {
    id: string;
    type: string;
    flowPct: number;
    slots: Slot[];
}

export interface WaterStats {
    level: number;
    ph: number;
    tds: number;
    nh3: number;
    no2: number;
    no3: number;
    o2: number;
    co2: number;
    food: number;
    algae: number;
    bacteria: number;
    kh: number;
    gh: number;
}

export interface SystemStats {
    bio: number;
    mech: number;
    flow: number;
    hasCO2: boolean;
    isLeaking: boolean;
    isActive: boolean;
}

export interface Decoration {
    id: string;
    name: string;
    cost: number;
    x: number;
    y: number;
    scale: number;
    type: 'rock' | 'wood' | 'ornament';
    color: string;
    flip?: boolean;
}

export interface SaveData {
    volumeLiters: number;
    money: number;
    gameTimeHours: number;
    water: WaterStats;
    fishes: Fish[];
    plants: Plant[];
    pipeline: (PipelineNode | null)[];
    sysStats: SystemStats;
    feederLevel?: number;
    decorations?: Decoration[];
}
