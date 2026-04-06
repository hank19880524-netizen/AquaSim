import { FISH_DB, SHRIMP_DB, SNAIL_DB, PLANT_DB, EQUIP_DB, MEDIA_DB, DECOR_DB, FEEDER_UPGRADES } from './constants';
import { Fish, Plant, PipelineNode, WaterStats, SystemStats, SaveData, Decoration } from './types';

export class AquariumSimulation {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    volumeLiters: number;
    money: number;
    gameTimeHours: number;
    water: WaterStats;
    fishes: Fish[];
    plants: Plant[];
    pipeline: (PipelineNode | null)[];
    sysStats: SystemStats;
    feederLevel: number;
    decorations: Decoration[];
    lightOn: boolean;
    envyBuff: number;
    bubbles: any[];
    foodParticles: any[];
    dusts: any[];
    speed: number;
    tickRateMs: number;
    tickAccumulator: number;
    actionText: string;
    actionTextTimer: number;
    isRunning: boolean;
    alerts: string[] = [];
    statusLog: { text: string, time: string }[] = [];
    catPawX: number = 0;
    catPawY: number = -300;
    catPawActive: boolean = false;
    catPawTimer: number = 0;
    catPawState: 'idle' | 'reaching' | 'grabbing' | 'retracting' = 'idle';
    catPawTargetFish: Fish | null = null;
    lastTime: number | null;
    simInterval: any;
    animFrameId: number;
    onUpdateUI: (sim: AquariumSimulation) => void;

    // Interactive Elements
    intakeX: number = 50;
    intakeY: number = 100;
    outflowX: number = 1900;
    outflowY: number = 100;
    draggedItem: { type: 'intake' | 'outflow' | 'decoration' | null, index: number | null } = { type: null, index: null };

    constructor(canvas: HTMLCanvasElement, volume = 100, initialMoney = 300, loadData: SaveData | null = null, onUpdateUI: (sim: AquariumSimulation) => void) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.onUpdateUI = onUpdateUI;

        this.tickRateMs = 1000;
        this.speed = 0.5;
        this.tickAccumulator = 0;
        this.actionText = "";
        this.actionTextTimer = 0;
        this.isRunning = true;
        this.lastTime = null;

        if (loadData) {
            this.volumeLiters = loadData.volumeLiters;
            this.money = loadData.money;
            this.gameTimeHours = loadData.gameTimeHours;
            this.water = loadData.water;
            this.fishes = loadData.fishes;
            this.plants = loadData.plants;
            this.pipeline = loadData.pipeline;
            this.sysStats = loadData.sysStats;
            this.feederLevel = loadData.feederLevel || 0;
            this.decorations = loadData.decorations || [];
            this.lightOn = true;
            this.envyBuff = 0;
            this.bubbles = [];
            this.foodParticles = [];
            this.dusts = Array.from({length: 60}, () => ({ x: Math.random() * 2000, y: Math.random() * 1000, s: Math.random() * 1.5 + 0.3, v: Math.random() * 0.2 + 0.05, drift: Math.random() * Math.PI * 2 }));
        } else {
            this.volumeLiters = volume;
            this.money = initialMoney;
            this.gameTimeHours = 8;
            this.water = { level: 100, ph: 7.0, tds: 150.0, nh3: 0.0, no2: 0.0, no3: 5.0, o2: 8.0, co2: 3.0, food: 0, algae: 0, bacteria: 10, kh: 4.0, gh: 5.0 };
            this.feederLevel = 0;
            this.decorations = [];
            this.lightOn = true;
            this.envyBuff = 0;
            this.pipeline = [
                { id: this.generateId(), type: 'intake', flowPct: 100, slots: [] },
                { id: this.generateId(), type: 'hose', flowPct: 100, slots: [] },
                { id: this.generateId(), type: 'prefilter', flowPct: 100, slots: [{ type: 'sponge', dirt: 0 }, { type: 'sponge', dirt: 0 }, { type: 'floss', dirt: 0 }] },
                { id: this.generateId(), type: 'canister', flowPct: 100, slots: [{ type: 'ceramic', dirt: 0 }, { type: 'ceramic', dirt: 0 }, { type: 'ceramic', dirt: 0 }, { type: 'floss', dirt: 0 }] },
                { id: this.generateId(), type: 'outflow', flowPct: 100, slots: [] },
                null, null, null, null, null
            ];
            this.sysStats = { bio: 0, mech: 0, flow: 0, hasCO2: false, isLeaking: false, isActive: true };
            this.fishes = []; this.plants = []; this.bubbles = []; this.foodParticles = [];
            this.dusts = Array.from({length: 60}, () => ({ x: Math.random() * 2000, y: Math.random() * 1000, s: Math.random() * 1.5 + 0.3, v: Math.random() * 0.2 + 0.05, drift: Math.random() * Math.PI * 2 }));
            
            this.spawnFish('guppy'); this.spawnFish('guppy');
            this.spawnFish('tetra'); this.spawnFish('tetra');
            this.spawnFish('cherry_shrimp');
            
            this.spawnPlant('anubias', 150); 
            this.spawnPlant('javafern', 400);
            this.spawnPlant('vallisneria', 600);
        }

        this.recalcPipelineStats();
        this.animFrameId = requestAnimationFrame((t) => this.renderLoop(t));
        this.simInterval = setInterval(() => this.ecoTick(), this.tickRateMs);

        // Event Listeners for Dragging
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            this.handleMouseDown(touch as any);
        }, { passive: false });
        this.canvas.addEventListener('touchmove', (e) => {
            const touch = e.touches[0];
            this.handleMouseMove(touch as any);
            e.preventDefault();
        }, { passive: false });
        this.canvas.addEventListener('touchend', () => this.handleMouseUp());
    }

    handleMouseDown(e: MouseEvent) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;

        // Check Intake
        if (Math.hypot(mx - this.intakeX, my - this.intakeY) < 60) {
            this.draggedItem = { type: 'intake', index: null };
            return;
        }
        // Check Outflow
        if (Math.hypot(mx - this.outflowX, my - this.outflowY) < 60) {
            this.draggedItem = { type: 'outflow', index: null };
            return;
        }
        // Check Decorations (Reverse order for top-most)
        for (let i = this.decorations.length - 1; i >= 0; i--) {
            const d = this.decorations[i];
            if (Math.hypot(mx - d.x, my - d.y + 30) < 80) {
                this.draggedItem = { type: 'decoration', index: i };
                return;
            }
        }
    }

    handleMouseMove(e: MouseEvent) {
        if (!this.draggedItem.type) return;
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;

        const waterY = this.canvas.height - (this.canvas.height * (this.water.level / 100));

        if (this.draggedItem.type === 'intake') {
            this.intakeX = Math.max(20, Math.min(this.canvas.width - 20, mx));
            this.intakeY = Math.max(waterY, Math.min(this.canvas.height - 100, my));
        } else if (this.draggedItem.type === 'outflow') {
            this.outflowX = Math.max(20, Math.min(this.canvas.width - 20, mx));
            this.outflowY = Math.max(waterY, Math.min(this.canvas.height - 100, my));
        } else if (this.draggedItem.type === 'decoration' && this.draggedItem.index !== null) {
            const d = this.decorations[this.draggedItem.index];
            d.x = Math.max(50, Math.min(this.canvas.width - 50, mx));
            // Decorations stay on ground
            d.y = this.canvas.height - 30;
        }
    }

    handleMouseUp() {
        this.draggedItem = { type: null, index: null };
    }

    stop() {
        this.isRunning = false;
        clearInterval(this.simInterval);
        cancelAnimationFrame(this.animFrameId);
    }

    generateId() { return Math.random().toString(36).substr(2, 9); }

    showActionText(text: string) { 
        this.actionText = text; 
        this.actionTextTimer = 90; 
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        this.statusLog.unshift({ text, time: timeStr });
        if (this.statusLog.length > 20) this.statusLog.pop();
    }

    feed() { 
        const upgrade = FEEDER_UPGRADES.find(u => u.level === this.feederLevel) || FEEDER_UPGRADES[0];
        if (this.money < 2) return;
        this.money -= 2;
        for(let i=0; i<upgrade.amount; i++) {
            this.water.food += 1;
            this.foodParticles.push({ x: Math.random()*(this.canvas.width-100)+50, y: -10 - Math.random()*30, vy: 0.8 + Math.random()*1.0 });
        }
        this.showActionText('🍕 投放飼料'); this.onUpdateUI(this); 
    }
    
    cleanGlass() { this.water.algae = 0; this.showActionText('✨ 刷缸除藻完成'); this.onUpdateUI(this); }
    
    changeWater() {
        if(this.water.level < 100) {
            this.water.level = 100; this.water.tds = (this.water.tds * 0.9) + 15; 
            this.showActionText('🌊 重新注滿水');
        } else {
            this.water.nh3 *= 0.6; this.water.no2 *= 0.6; this.water.no3 *= 0.6; this.water.o2 = Math.min(10, this.water.o2 + 2); this.water.algae *= 0.5; this.water.tds = (this.water.tds * 0.7) + (100 * 0.3); 
            this.showActionText('💦 換水 30% 完成');
        }
        for(let i=0; i<30; i++) this.bubbles.push({ x: Math.random() * this.canvas.width, y: this.canvas.height - Math.random() * 50, size: 2 + Math.random() * 4, vy: 0.5 + Math.random() * 1.5, wobble: Math.random()*Math.PI*2 });
        this.onUpdateUI(this);
    }

    removeDeadFish() { 
        const waterY = this.canvas.height - (this.canvas.height * (this.water.level / 100));
        const initLen = this.fishes.length; 
        this.fishes = this.fishes.filter(f => {
            if (!f.isDead) return true;
            if (f.y > waterY + 30) return true; 
            return false; 
        }); 
        if (this.fishes.length < initLen) this.showActionText('🐟 撈除浮屍'); 
        this.onUpdateUI(this); 
    }

    toggleLight() { 
        this.lightOn = !this.lightOn; 
        this.showActionText(this.lightOn ? '💡 開啟植物燈' : '🌙 關閉植物燈');
        this.onUpdateUI(this);
    }

    spawnFish(id: string, x?: number, y?: number, isBaby = false) {
        const f = FISH_DB.find(x => x.id === id) || SHRIMP_DB.find(x => x.id === id) || SNAIL_DB.find(x => x.id === id); 
        if(!f) return;
        const newFish: Fish = {
            ...f, 
            x: x ?? Math.random()*(this.canvas.width-100)+50, 
            y: y ?? Math.random()*(this.canvas.height-150)+50, 
            vx: 0, vy: 0, 
            targetVx: (Math.random()-0.5)*3, 
            targetVy: (Math.random()-0.5)*1, 
            swimCycle: Math.random() * Math.PI * 2, 
            health: 100, isDead: false, hunger: 0, 
            targetY: f.shape==='bottom'||f.shape==='shrimp'||f.shape==='snail'?this.canvas.height-30:null,
            size: isBaby ? f.size * 0.5 : f.size * 0.8,
            maxSize: f.size * (1.2 + Math.random() * 0.4),
            growthRate: 0.005 + Math.random() * 0.01,
            age: isBaby ? 0 : 50,
            isPregnant: false,
            pregnancyTime: 0
        };
        this.fishes.push(newFish);
    }

    spawnPlant(id: string, x: number) {
        const p = PLANT_DB.find(px => px.id === id);
        if(p) this.plants.push({ ...p, x: x, height: 60+Math.random()*60 });
    }

    spawnDecoration(id: string) {
        const d = DECOR_DB.find(x => x.id === id);
        if(!d) return;
        if(this.money < d.cost) return;
        this.money -= d.cost;
        this.decorations.push({
            ...d,
            x: Math.random() * (this.canvas.width - 200) + 100,
            y: this.canvas.height - 30,
            scale: 0.8 + Math.random() * 0.4,
            flip: Math.random() > 0.5
        } as any);
        this.onUpdateUI(this);
    }

    upgradeFeeder() {
        const nextLevel = this.feederLevel + 1;
        const upgrade = FEEDER_UPGRADES.find(u => u.level === nextLevel);
        if(!upgrade) return;
        if(this.money < upgrade.cost) return;
        this.money -= upgrade.cost;
        this.feederLevel = nextLevel;
        this.showActionText(`🚀 飼料系統升級: ${upgrade.name}`);
        this.onUpdateUI(this);
    }

    setSpeed(m: number) { 
        this.speed = m; 
        if(m === 0) this.showActionText('⏸️ 時間暫停');
        else if(m > 1) this.showActionText('⏩ 時間加速');
        this.onUpdateUI(this);
    }
    
    useItem(t: string) {
        const costs: any = {seed:15, envy:10, kh:5, gh:5};
        if(this.money < costs[t]) return;
        this.money -= costs[t];
        if(t==='seed') { this.water.bacteria = Math.min(this.sysStats.bio, this.water.bacteria + 30); this.water.tds += 5; this.showActionText('🧪 補充硝化菌'); }
        if(t==='envy') { this.envyBuff = 48; this.water.tds += 10; this.showActionText('🧪 補充水草液肥'); }
        if(t==='kh') { this.water.kh += 2.0; this.water.tds += 35; this.showActionText('🧪 提升 KH 值'); }
        if(t==='gh') { this.water.gh += 2.0; this.water.tds += 35; this.showActionText('🧪 提升 GH 值'); }
        this.onUpdateUI(this);
    }

    updatePipelineNode(index: number, type: string | null) {
        if (type === null) {
            this.pipeline[index] = null;
        } else {
            const eq = EQUIP_DB[type];
            if (this.money < eq.cost) return;
            this.money -= eq.cost;
            this.pipeline[index] = {
                id: this.generateId(),
                type: type,
                flowPct: 100,
                slots: Array.from({ length: eq.maxSlots }, () => ({ type: 'empty', dirt: 0 }))
            };
        }
        this.recalcPipelineStats();
    }

    movePipelineNode(index: number, direction: 'left' | 'right') {
        const newIndex = direction === 'left' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= this.pipeline.length) return;
        
        const temp = this.pipeline[index];
        this.pipeline[index] = this.pipeline[newIndex];
        this.pipeline[newIndex] = temp;
        
        this.recalcPipelineStats();
        this.onUpdateUI(this);
    }

    updateSlot(nodeIdx: number, slotIdx: number, mediaType: string) {
        const node = this.pipeline[nodeIdx];
        if (!node) return;
        const mDb = MEDIA_DB[mediaType];
        if (this.money < mDb.cost) return;
        this.money -= mDb.cost;
        node.slots[slotIdx] = { type: mediaType, dirt: 0 };
        this.recalcPipelineStats();
    }

    cleanSlot(nodeIdx: number, slotIdx: number) {
        const node = this.pipeline[nodeIdx];
        if (!node || !node.slots[slotIdx]) return;
        node.slots[slotIdx].dirt = 0;
        this.recalcPipelineStats();
        this.showActionText('🧼 濾材清洗完成');
    }

    recalcPipelineStats() {
        let totalBio = 0, totalMech = 0, totalFlow = 0;
        let hasPump = false, isLeaking = false, isActive = false, hasCO2 = false;
        let totalDirtPenalty = 0, mediaCount = 0;

        this.pipeline.forEach(p => { 
            if(p) {
                if(EQUIP_DB[p.type].maxFlow > 0) hasPump = true; 
                if(p.type === 'co2_diffuser') hasCO2 = true;
            }
        });

        let connectedFlow = false;
        let traceStartIdx = this.pipeline.findIndex(p => p && p.type === 'intake');
        let traceEndIdx = -1;

        if (traceStartIdx !== -1) {
            connectedFlow = true;
            for(let i = traceStartIdx + 1; i < this.pipeline.length; i++) {
                const p = this.pipeline[i];
                if (!p) { connectedFlow = false; break; }
                if (p.type === 'outflow') { traceEndIdx = i; break; }
            }
        }

        if (connectedFlow && traceEndIdx !== -1) {
            isActive = true;
            for(let i = traceStartIdx; i <= traceEndIdx; i++) {
                const p = this.pipeline[i]!;
                const eq = EQUIP_DB[p.type];
                if(eq.maxFlow > 0) totalFlow += eq.maxFlow * (p.flowPct / 100);
                p.slots.forEach(s => {
                    if(s.type === 'empty') return;
                    const mDb = MEDIA_DB[s.type];
                    const dirtRatio = Math.min(1, s.dirt / 100);
                    totalBio += mDb.bio * (1 - (dirtRatio * 0.2)); 
                    totalMech += mDb.mech * (1 - dirtRatio);
                    totalDirtPenalty += dirtRatio;
                    mediaCount++;
                });
            }
        } else {
            isActive = false;
            if (hasPump) isLeaking = true;
        }

        if(mediaCount > 0) {
            const avgDirt = totalDirtPenalty / mediaCount;
            totalFlow *= (1 - (avgDirt * 0.5)); 
        }

        this.sysStats = { bio: totalBio, mech: Math.min(0.95, totalMech), flow: isActive ? totalFlow : 0, isLeaking: isLeaking, isActive: isActive, hasCO2: hasCO2 };
        this.onUpdateUI(this);
    }

    getAlerts() {
        const alerts: string[] = [];
        if (this.water.nh3 > 0.1) alerts.push('⚠️ 氨濃度過高！');
        if (this.water.no2 > 0.1) alerts.push('⚠️ 亞硝酸鹽濃度過高！');
        if (this.water.o2 < 4) alerts.push('💨 溶氧量不足！');
        if (this.water.level < 80) alerts.push('💧 水位過低，請加水！');
        if (this.sysStats.isLeaking) alerts.push('🚨 系統漏水中！');
        
        const hungryCount = this.fishes.filter(f => !f.isDead && f.hunger > 70).length;
        if (hungryCount > 0) alerts.push(`🍽️ 有 ${hungryCount} 隻生物感到飢餓`);
        
        const sickCount = this.fishes.filter(f => !f.isDead && f.health < 50).length;
        if (sickCount > 0) alerts.push(`💊 有 ${sickCount} 隻生物健康狀況不佳`);

        const deadCount = this.fishes.filter(f => f.isDead).length;
        if (deadCount > 0) alerts.push(`💀 缸內有 ${deadCount} 具遺體需撈除`);

        return alerts;
    }

    ecoTick() {
        if(!this.isRunning) return;
        if(this.speed > 0) {
            this.tickAccumulator += this.speed;
            while(this.tickAccumulator >= 1) { this.ecoTickCore(); this.tickAccumulator -= 1; }
        }
        this.onUpdateUI(this);
    }

    ecoTickCore() {
        this.gameTimeHours++;
        const dilution = 100 / this.volumeLiters; 
        const oldNh3 = this.water.nh3; 

        // Automatic feeding
        if (this.feederLevel >= 2) {
            const upgrade = FEEDER_UPGRADES.find(u => u.level === this.feederLevel)!;
            if (Math.random() < 0.2) {
                for(let i=0; i<upgrade.amount; i++) {
                    this.water.food += 1;
                    this.foodParticles.push({ x: Math.random()*(this.canvas.width-100)+50, y: -10 - Math.random()*30, vy: 0.8 + Math.random()*1.0 });
                }
            }
        }

        if(this.gameTimeHours % 24 === 0) {
            let aliveFishes = this.fishes.filter(f=>!f.isDead);
            let uniqueSpecies = new Set(aliveFishes.map(f=>f.id)).size;
            let income = 10 + (aliveFishes.length * 2) + (uniqueSpecies * 15);
            this.money += income;
            this.water.kh = Math.max(0, this.water.kh - 0.1 * dilution);
            this.water.gh = Math.max(0, this.water.gh - 0.05 * dilution);
        }
        
        if (this.envyBuff > 0) this.envyBuff--;
        if (this.sysStats.isLeaking) this.water.level = Math.max(0, this.water.level - 2.0);

        if (this.water.level < 50) {
            this.fishes.forEach(f => { if(!f.isDead) f.health -= 3; });
        }

        this.water.o2 = Math.min(10, Math.max(0, this.water.o2 + this.sysStats.flow * 0.5 * dilution));

        let filteredWaste = 0;
        if(this.water.food > 0) {
            filteredWaste = this.water.food * this.sysStats.mech;
            this.water.food -= filteredWaste;
            let decay = Math.min(this.water.food, 2);
            this.water.food -= decay;
            this.water.nh3 += decay * 0.015 * dilution; 
            this.water.tds += decay * 0.1 * dilution; 
        }

        if (this.sysStats.isActive && filteredWaste > 0) {
            let endIdx = this.pipeline.findIndex(x => x && x.type === 'outflow');
            for(let i=0; i<=endIdx; i++) {
                if(this.pipeline[i] && this.pipeline[i]!.slots) {
                    this.pipeline[i]!.slots.forEach(s => {
                        if(s.type !== 'empty') s.dirt = Math.min(100, s.dirt + (filteredWaste * MEDIA_DB[s.type].dirtRate * 0.5));
                    });
                }
            }
            this.recalcPipelineStats();
        }

        let aliveFish = this.fishes.filter(f => !f.isDead);
        for(let fish of aliveFish) {
            this.water.o2 -= 0.05 * fish.bioLoad * dilution;
            this.water.nh3 += 0.005 * fish.bioLoad * dilution; 
            this.water.tds += 0.02 * fish.bioLoad * dilution; 
            fish.hunger += 2;
            // if(this.water.food > 0 && fish.hunger > 60) { this.water.food -= 1; fish.hunger = 0; fish.health = Math.min(100, fish.health + 5); }

            // Growth
            if(fish.hunger < 50 && fish.size < fish.maxSize) {
                fish.size += fish.growthRate * dilution;
            }
            fish.age = (fish.age || 0) + 1 * dilution;

            // Breeding
            if(!fish.isPregnant && fish.size > fish.maxSize * 0.8 && this.water.no3 < 15 && this.water.nh3 < 0.05 && this.water.o2 > 6) {
                if(Math.random() < 0.005 * dilution) {
                    fish.isPregnant = true;
                    fish.pregnancyTime = 24; 
                    this.showActionText(`💖 ${fish.name} 準備產卵了`);
                }
            }

            if(fish.isPregnant) {
                fish.pregnancyTime = (fish.pregnancyTime || 0) - 1 * dilution;
                if(fish.pregnancyTime <= 0) {
                    fish.isPregnant = false;
                    const babyCount = Math.floor(Math.random() * 3) + 1;
                    for(let i=0; i<babyCount; i++) {
                        this.spawnFish(fish.id, fish.x, fish.y, true);
                    }
                    this.showActionText(`🐣 ${fish.name} 產下了幼魚！`);
                }
            }

            let damage = 0;
            let minPh = (fish.id === 'discus' || fish.id === 'ram') ? 6.2 : 5.8;
            let maxPh = (fish.id === 'discus' || fish.id === 'ram') ? 7.2 : 8.2;
            if (fish.shape === 'shrimp') { minPh = 6.0; maxPh = 7.5; } 

            if(this.water.nh3 > 0.5) damage += (this.water.nh3 - 0.5) * 5;
            if(this.water.no2 > 0.5) damage += (this.water.no2 - 0.5) * 3;
            if(this.water.o2 < 3) damage += (3 - this.water.o2) * 2;
            if(this.water.ph < minPh || this.water.ph > maxPh) damage += 1;
            if(this.water.co2 > 30.0) damage += (this.water.co2 - 30.0) * 1; 
            if(fish.hunger > 80) damage += 2;
            if(fish.id === 'betta' && this.sysStats.flow > 3.0) damage += 1; 

            fish.health -= damage;
            if(fish.health <= 0) { fish.isDead = true; fish.health = 0; }
            if(fish.shape === 'shrimp' && this.water.algae > 0) this.water.algae = Math.max(0, this.water.algae - 0.05 * dilution);
            else if (fish.shape === 'snail' && this.water.algae > 0) this.water.algae = Math.max(0, this.water.algae - 0.08 * dilution);
        }

        let deadFish = this.fishes.filter(f => f.isDead);
        if(deadFish.length > 0) {
            let deadPollution = deadFish.reduce((sum, f) => sum + (f.bioLoad * 0.5), 0);
            this.water.nh3 += deadPollution * dilution;
            this.water.tds += deadPollution * 5 * dilution; 
        }

        let targetBacteria = Math.min(this.sysStats.bio, 5 + this.water.nh3 * 20);
        this.water.bacteria += (targetBacteria - this.water.bacteria) * 0.05;
        let nh3_processed = Math.min(this.water.nh3, this.water.bacteria * 0.05 * dilution);
        this.water.nh3 -= nh3_processed; this.water.no2 += nh3_processed;
        let no2_processed = Math.min(this.water.no2, this.water.bacteria * 0.05 * dilution);
        this.water.no2 -= no2_processed; this.water.no3 += no2_processed;

        if (this.sysStats.isActive && this.sysStats.hasCO2) this.water.co2 += 1.0 * dilution; 
        this.water.co2 -= (this.water.co2 - 3.0) * (0.01 + this.sysStats.flow * 0.01) * dilution;
        this.water.co2 = Math.max(0, this.water.co2);

        for(let plant of this.plants) {
            if(this.lightOn) {
                let co2Need = 0.1 * plant.nAbsorb * dilution;
                if(this.water.no3 > 0.1 && this.water.gh > 1.0 && this.water.co2 > co2Need) {
                    this.water.co2 -= co2Need;
                    let gm = this.envyBuff > 0 ? 3 : 1;
                    this.water.no3 -= (0.05 * plant.nAbsorb) * gm * dilution; 
                    this.water.o2 += 0.2 * gm * dilution;
                    if(plant.height < plant.maxH) plant.height += 1.0 * gm;
                }
            } else {
                this.water.o2 -= 0.05 * dilution;
                this.water.co2 += 0.02 * dilution; 
            }
        }

        if(this.lightOn && this.water.no3 > 20) this.water.algae += (this.water.no3 - 20) * 0.1 * dilution;
        this.water.algae = Math.min(100, Math.max(0, this.water.algae));
        
        let targetPh = 7.0 + (this.water.kh - 4.0) * 0.05 - (this.water.no3 * 0.005) - (this.water.nh3 * 0.1) + (this.lightOn ? 0.2 : -0.1);
        this.water.ph += (Math.max(5.0, Math.min(9.0, targetPh)) - this.water.ph) * 0.05;

        // Cat Event Trigger
        if(!this.catPawActive && Math.random() < 0.001 * dilution) {
            this.catPawActive = true;
            this.catPawState = 'reaching';
            this.catPawX = Math.random() * this.canvas.width;
            this.catPawY = -300;
            this.catPawTimer = 0;
            this.catPawTargetFish = aliveFish.length > 0 ? aliveFish[Math.floor(Math.random() * aliveFish.length)] : null;
            this.showActionText('⚠️ 警告：有貓出沒！');
        }
    }

    renderLoop(timestamp: number) {
        if(!this.isRunning) return;
        if(!this.lastTime) this.lastTime = timestamp;
        let dt = timestamp - this.lastTime;
        if(dt > 50) dt = 16.66; 
        this.lastTime = timestamp;
        let timeScale = (this.speed === 0) ? 0 : dt / 16.66;
        if(isNaN(timeScale) || timeScale < 0) timeScale = 1;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 1. Realistic Background Gradient (Brightened)
        const bgGrad = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        bgGrad.addColorStop(0, '#38bdf8'); // Brighter blue top (Sky 400)
        bgGrad.addColorStop(1, '#0284c7'); // Rich blue bottom (Sky 600)
        this.ctx.fillStyle = bgGrad;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        let algaeRatio = this.water.algae / 100;
        const waterHeight = this.canvas.height * (this.water.level / 100);
        const waterY = this.canvas.height - waterHeight;
        
        this.ctx.fillStyle = `rgba(${100 - algaeRatio*60}, ${190 + algaeRatio*30}, ${240 - algaeRatio*140}, ${0.15 + algaeRatio*0.4})`;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.canvas.height);
        this.ctx.lineTo(0, waterY);
        for(let x = 0; x <= this.canvas.width; x += 20) {
            let wave = (this.water.level < 100 && timeScale > 0) ? Math.sin(x * 0.02 + timestamp * 0.002) * 4 + Math.cos(x * 0.015 - timestamp * 0.0015) * 2 : 0;
            this.ctx.lineTo(x, waterY + wave);
        }
        this.ctx.lineTo(this.canvas.width, this.canvas.height);
        this.ctx.fill();

        if (this.lightOn) {
            this.ctx.globalCompositeOperation = 'screen';
            this.ctx.fillStyle = `rgba(255, 255, 255, ${0.12 - algaeRatio*0.08})`; 
            for(let i=0; i<6; i++) {
                this.ctx.beginPath();
                let cx = this.canvas.width * 0.2 * i + Math.sin(timestamp*0.0003 + i)*100;
                this.ctx.moveTo(cx, waterY);
                this.ctx.lineTo(cx + 250 + Math.sin(timestamp*0.0002+i)*150, this.canvas.height);
                this.ctx.lineTo(cx - 150 - Math.cos(timestamp*0.0003+i)*150, this.canvas.height);
                this.ctx.fill();
            }
            this.ctx.globalCompositeOperation = 'source-over';
        }

        this.ctx.fillStyle = `rgba(255, 255, 255, ${0.15 + algaeRatio*0.2})`; 
        this.dusts.forEach(d => {
            if (timeScale > 0) { d.y -= d.v * timeScale; d.drift += 0.01 * timeScale; }
            let actX = (d.x + Math.sin(d.drift) * 20) % this.canvas.width;
            if(actX < 0) actX += this.canvas.width;
            if(d.y < waterY) d.y = this.canvas.height;
            this.ctx.beginPath(); this.ctx.arc(actX, d.y, d.s, 0, Math.PI*2); this.ctx.fill();
        });

        this.ctx.fillStyle = '#2f271c'; this.ctx.fillRect(0, this.canvas.height - 30, this.canvas.width, 30);
        this.ctx.fillStyle = '#4a3f2d'; this.ctx.fillRect(0, this.canvas.height - 25, this.canvas.width, 25);

        // 2. Draw Pipes (Intake & Outflow)
        this.ctx.lineWidth = 12;
        this.ctx.lineCap = 'round';
        this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.6)';
        
        // Intake Pipe
        this.ctx.beginPath();
        this.ctx.moveTo(this.intakeX, -50);
        this.ctx.lineTo(this.intakeX, this.intakeY);
        this.ctx.stroke();
        this.ctx.fillStyle = 'rgba(150, 150, 150, 0.8)';
        this.ctx.fillRect(this.intakeX - 15, this.intakeY, 30, 40); // Strainer
        for(let j=0; j<4; j++) {
            this.ctx.strokeStyle = 'rgba(50, 50, 50, 0.5)';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(this.intakeX - 15, this.intakeY + j*10, 30, 1);
        }

        // Outflow Pipe
        this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.6)';
        this.ctx.lineWidth = 12;
        this.ctx.beginPath();
        this.ctx.moveTo(this.outflowX, -50);
        this.ctx.lineTo(this.outflowX, this.outflowY);
        this.ctx.lineTo(this.outflowX - 40, this.outflowY + 20);
        this.ctx.stroke();
        // Water flow effect from outflow
        if (this.sysStats.isActive && timeScale > 0) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            for(let k=0; k<3; k++) {
                const ox = this.outflowX - 45 - Math.random()*20;
                const oy = this.outflowY + 25 + Math.random()*10;
                this.ctx.beginPath(); this.ctx.arc(ox, oy, 3, 0, Math.PI*2); this.ctx.fill();
                if(Math.random() < 0.1) this.bubbles.push({ x: ox, y: oy, size: 2+Math.random()*3, vy: 0.5+Math.random(), wobble: Math.random()*Math.PI*2 });
            }
        }

        // 3. Draw Decorations
        this.decorations.forEach(d => {
            this.ctx.save();
            this.ctx.translate(d.x, d.y);
            if(d.flip) this.ctx.scale(-1, 1);
            this.ctx.scale(d.scale, d.scale);
            this.ctx.fillStyle = d.color;
            if(d.type === 'rock') {
                this.ctx.beginPath();
                this.ctx.moveTo(-40, 0);
                this.ctx.lineTo(-30, -50);
                this.ctx.lineTo(10, -70);
                this.ctx.lineTo(50, -40);
                this.ctx.lineTo(60, 0);
                this.ctx.closePath();
                this.ctx.fill();
            } else if(d.type === 'wood') {
                this.ctx.beginPath();
                this.ctx.moveTo(-60, 0);
                this.ctx.quadraticCurveTo(-20, -80, 40, -20);
                this.ctx.lineTo(80, -40);
                this.ctx.lineTo(100, 0);
                this.ctx.closePath();
                this.ctx.fill();
            } else if(d.type === 'ornament') {
                if(d.id === 'ornament_2') { // Treasure chest
                    this.ctx.fillRect(-30, -40, 60, 40);
                    this.ctx.fillStyle = '#854d0e';
                    this.ctx.fillRect(-30, -45, 60, 10);
                    if(Math.random() < 0.1 && timeScale > 0) {
                        this.bubbles.push({ x: d.x + (Math.random()-0.5)*40, y: d.y - 40, size: 3+Math.random()*4, vy: 1+Math.random(), wobble: Math.random()*Math.PI*2 });
                    }
                } else { // Shipwreck
                    this.ctx.beginPath();
                    this.ctx.moveTo(-80, 0);
                    this.ctx.lineTo(-100, -40);
                    this.ctx.lineTo(20, -20);
                    this.ctx.lineTo(40, 0);
                    this.ctx.fill();
                }
            }
            this.ctx.restore();
        });

        for(let plant of this.plants) {
            let actualHeight = Math.min(plant.height, waterHeight - 20); 
            if(actualHeight < 10) continue;
            let swayTop = (timeScale > 0) ? Math.sin(timestamp * 0.0015 + plant.x) * (plant.shape === 'carpet' ? 3 : 15) : 0;
            let swayMid = (timeScale > 0) ? Math.sin(timestamp * 0.001 + plant.x) * (plant.shape === 'carpet' ? 1 : 8) : 0;
            const leafColor = this.envyBuff > 0 ? '#4ade80' : plant.color;
            this.ctx.fillStyle = leafColor; this.ctx.strokeStyle = leafColor; 
            if (plant.shape === 'grass') {
                for(let b=0; b<3; b++) {
                    this.ctx.beginPath(); this.ctx.moveTo(plant.x, this.canvas.height - 20);
                    let bSway = swayTop * (0.8 + b*0.2);
                    this.ctx.quadraticCurveTo(plant.x + bSway/2 + (b-1)*10, this.canvas.height - actualHeight*0.5, plant.x + bSway + (b-1)*15, this.canvas.height - actualHeight + b*10);
                    this.ctx.lineWidth = 4; this.ctx.stroke();
                }
            } else if (plant.shape === 'carpet') {
                for(let i=0; i<plant.leaves * 1.5; i++) {
                    let lx = plant.x + (Math.random()-0.5)*40; let ly = this.canvas.height - 20 - Math.random()*(actualHeight+10);
                    this.ctx.beginPath(); this.ctx.moveTo(lx, ly); this.ctx.lineTo(lx + (Math.random()-0.5)*15, ly - Math.random()*10); this.ctx.lineWidth = 4; this.ctx.stroke();
                }
            } else {
                this.ctx.lineWidth = 5; this.ctx.beginPath(); this.ctx.moveTo(plant.x, this.canvas.height - 20);
                this.ctx.bezierCurveTo(plant.x + swayMid, this.canvas.height - actualHeight*0.3, plant.x + swayTop*0.5, this.canvas.height - actualHeight*0.6, plant.x + swayTop, this.canvas.height - actualHeight);
                this.ctx.stroke();
                for(let i=1; i<=plant.leaves; i++) {
                    let t = i / plant.leaves; let leafY = this.canvas.height - 20 - (actualHeight * t); let currentSway = swayTop * t;
                    let leafWobble = (timeScale > 0) ? Math.sin(timestamp * 0.002 + plant.x + i) * 0.2 : 0;
                    let leafSize = plant.shape === 'broad' ? 24 : 12; let dir = i % 2 === 0 ? 1 : -1;
                    this.ctx.save(); this.ctx.translate(plant.x + currentSway, leafY); this.ctx.rotate(dir * (Math.PI/4 + leafWobble));
                    this.ctx.beginPath(); this.ctx.moveTo(0, 0); this.ctx.quadraticCurveTo(leafSize*0.5, -leafSize*0.3, leafSize, 0); this.ctx.quadraticCurveTo(leafSize*0.5, leafSize*0.3, 0, 0); this.ctx.fill();
                    this.ctx.restore();
                }
            }
        }

        for(let i = this.bubbles.length - 1; i >= 0; i--) {
            let b = this.bubbles[i]; b.y -= b.vy * timeScale; b.wobble += 0.1 * timeScale; b.x += Math.sin(b.wobble) * 1.5 * timeScale;
            this.ctx.fillStyle = 'rgba(255,255,255,0.4)'; this.ctx.beginPath(); this.ctx.arc(b.x, b.y, Math.max(0.1, b.size), 0, Math.PI * 2); this.ctx.fill();
            if(b.y < waterY) this.bubbles.splice(i, 1);
        }

        this.ctx.fillStyle = '#f472b6'; // Pink heart food
        for(let i = this.foodParticles.length - 1; i >= 0; i--) {
            let f = this.foodParticles[i];
            if(f.y < waterY) f.y += f.vy * 2 * timeScale; else if(f.y < this.canvas.height - 25) f.y += f.vy * timeScale; else f.y = this.canvas.height - 25; 
            
            // Eating logic
            let eaten = false;
            for(let fish of this.fishes) {
                if(!fish.isDead && Math.hypot(fish.x - f.x, fish.y - f.y) < 25) {
                    this.foodParticles.splice(i, 1);
                    fish.hunger = Math.max(0, fish.hunger - 40);
                    fish.health = Math.min(100, fish.health + 10);
                    this.water.food = Math.max(0, this.water.food - 1); // Reduce global food count
                    eaten = true;
                    break;
                }
            }
            if(eaten) continue;

            // Draw Heart Shaped Food
            this.ctx.save();
            this.ctx.translate(f.x, f.y);
            this.ctx.beginPath();
            const size = 6;
            this.ctx.moveTo(0, 0);
            this.ctx.bezierCurveTo(-size, -size, -size*2, size/2, 0, size*1.5);
            this.ctx.bezierCurveTo(size*2, size/2, size, -size, 0, 0);
            this.ctx.fill();
            this.ctx.restore();
        }

        // 3. Draw Cat Paw
        if(this.catPawActive) {
            this.catPawTimer += timeScale;
            if(this.catPawState === 'reaching') {
                this.catPawY += 5 * timeScale;
                if(this.catPawY > 100) this.catPawState = 'grabbing';
            } else if(this.catPawState === 'grabbing') {
                if(this.catPawTargetFish && !this.catPawTargetFish.isDead) {
                    this.catPawX += (this.catPawTargetFish.x - this.catPawX) * 0.05 * timeScale;
                    this.catPawY += (this.catPawTargetFish.y - this.catPawY) * 0.05 * timeScale;
                    const dist = Math.hypot(this.catPawX - this.catPawTargetFish.x, this.catPawY - this.catPawTargetFish.y);
                    if(dist < 30) {
                        this.catPawTargetFish.isDead = true;
                        this.fishes = this.fishes.filter(f => f !== this.catPawTargetFish);
                        this.showActionText(`😿 糟糕！${this.catPawTargetFish.name} 被貓抓走了！`);
                        this.catPawState = 'retracting';
                    }
                }
                if(this.catPawTimer > 200) this.catPawState = 'retracting';
            } else if(this.catPawState === 'retracting') {
                this.catPawY -= 8 * timeScale;
                if(this.catPawY < -300) {
                    this.catPawActive = false;
                    this.catPawState = 'idle';
                }
            }
            this.ctx.save();
            this.ctx.translate(this.catPawX, this.catPawY);
            this.ctx.fillStyle = '#f97316';
            this.ctx.beginPath();
            this.ctx.roundRect(-40, -600, 80, 600, 20);
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 45, 0, Math.PI*2);
            this.ctx.fill();
            this.ctx.fillStyle = '#ffedd5';
            for(let i=-1; i<=1; i++) {
                this.ctx.beginPath();
                this.ctx.arc(i*25, 15, 15, 0, Math.PI*2);
                this.ctx.fill();
            }
            this.ctx.restore();
        }

        for(let fish of this.fishes) {
            let topBound = waterY + 15; let bottomBound = this.canvas.height - 30;
            if(!fish.isDead) {
                // Food chasing logic
                if(fish.hunger > 40 && this.foodParticles.length > 0) {
                    let nearestFood = null;
                    let minDist = Infinity;
                    for(let f of this.foodParticles) {
                        let d = Math.hypot(fish.x - f.x, fish.y - f.y);
                        if(d < minDist) { minDist = d; nearestFood = f; }
                    }
                    if(nearestFood && minDist < 400) {
                        let dx = nearestFood.x - fish.x;
                        let dy = nearestFood.y - fish.y;
                        let angle = Math.atan2(dy, dx);
                        let speedMulti = fish.shape === 'round' ? 1.0 : (fish.shape === 'shrimp' ? 0.5 : (fish.shape === 'snail' ? 0.2 : 2.5));
                        fish.targetVx = Math.cos(angle) * 3.5 * speedMulti;
                        fish.targetVy = Math.sin(angle) * 2.0 * speedMulti;
                    }
                }

                fish.vx += (fish.targetVx - fish.vx) * 0.05 * timeScale; fish.vy += (fish.targetVy - fish.vy) * 0.05 * timeScale;
                fish.x += fish.vx * timeScale; fish.y += fish.vy * timeScale; fish.swimCycle += 0.15 * Math.max(0.5, Math.abs(fish.vx)) * timeScale;
                if(fish.x < 30) { fish.targetVx = Math.abs(fish.targetVx); fish.vx += 0.2; }
                if(fish.x > this.canvas.width - 30) { fish.targetVx = -Math.abs(fish.targetVx); fish.vx -= 0.2; }
                
                if(fish.shape === 'shrimp' || fish.shape === 'snail' || fish.shape === 'bottom') {
                    // Stay at bottom
                    const groundY = bottomBound - (fish.shape === 'snail' ? 2 : 5);
                    // Add a little "hop" for shrimp when moving
                    const hop = (fish.shape === 'shrimp' && Math.abs(fish.vx) > 0.5) ? Math.abs(Math.sin(fish.swimCycle * 2)) * 3 : 0;
                    const targetY = groundY - hop;
                    fish.vy += (targetY - fish.y) * 0.1 * timeScale;
                    fish.targetVy = 0;
                } else {
                    if(fish.y < topBound + 10) { fish.targetVy = Math.abs(fish.targetVy); fish.vy += 0.1; } 
                    if(fish.y > bottomBound - 10) { fish.targetVy = -Math.abs(fish.targetVy); fish.vy -= 0.1; }
                }
                if(Math.random() < 0.015 * timeScale) {
                    let speedMulti = fish.shape === 'round' ? 1.0 : (fish.shape === 'shrimp' ? 0.3 : (fish.shape === 'snail' ? 0.1 : 2.0));
                    fish.targetVx = (Math.random() - 0.5) * 3.0 * speedMulti; 
                    if(fish.shape !== 'shrimp' && fish.shape !== 'snail') fish.targetVy = (Math.random() - 0.5) * 1.5;
                }
            } else {
                fish.y -= 0.5 * timeScale; if(fish.y < topBound - 10) fish.y = topBound - 10;
            }
            this.ctx.save(); this.ctx.translate(fish.x, fish.y);
            
            // Draw Crown if fully grown
            if(fish.size >= fish.maxSize * 0.95 && !fish.isDead) {
                this.ctx.save();
                this.ctx.translate(0, -fish.size * 1.2);
                this.ctx.fillStyle = '#fbbf24';
                this.ctx.beginPath();
                this.ctx.moveTo(-fish.size*0.4, 0);
                this.ctx.lineTo(-fish.size*0.5, -fish.size*0.5);
                this.ctx.lineTo(-fish.size*0.2, -fish.size*0.3);
                this.ctx.lineTo(0, -fish.size*0.6);
                this.ctx.lineTo(fish.size*0.2, -fish.size*0.3);
                this.ctx.lineTo(fish.size*0.5, -fish.size*0.5);
                this.ctx.lineTo(fish.size*0.4, 0);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.restore();
            }

            if(!fish.isDead) {
                let tilt = (fish.shape !== 'shrimp' && fish.shape !== 'snail') ? Math.atan2(fish.vy, Math.max(0.1, Math.abs(fish.vx))) * 0.7 : 0;
                if(fish.tilt === undefined) fish.tilt = 0; fish.tilt += (tilt - fish.tilt) * 0.1 * timeScale;
                if (fish.vx < 0) { this.ctx.scale(-1, 1); this.ctx.rotate(-fish.tilt); } else { this.ctx.rotate(fish.tilt); }
            } else { this.ctx.rotate(Math.PI); }
            this.ctx.fillStyle = fish.color;
            if (fish.shape === 'shrimp') {
                // ULTRA KAWAII SHRIMP (Shrimp-Ball Style)
                const pulse = Math.sin(timestamp * 0.005) * 0.1;
                this.ctx.scale(1 + pulse, 1 + pulse);

                // Tiny Moving Legs (Crawling)
                this.ctx.strokeStyle = fish.color;
                this.ctx.lineWidth = 3;
                const legMove = Math.sin(fish.swimCycle * 4) * 5;
                for (let i = 0; i < 3; i++) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(-fish.size * 0.3 + i * fish.size * 0.3, fish.size * 0.5);
                    this.ctx.lineTo(-fish.size * 0.5 + i * fish.size * 0.3 + legMove, fish.size * 0.9);
                    this.ctx.stroke();
                }

                // Tiny Clapping Hands (Claws)
                const handMove = Math.sin(timestamp * 0.01) * 5;
                this.ctx.beginPath();
                this.ctx.moveTo(fish.size * 0.5, fish.size * 0.3);
                this.ctx.lineTo(fish.size * 0.8 + handMove, fish.size * 0.5);
                this.ctx.stroke();

                this.ctx.beginPath(); 
                // Very round head/body
                this.ctx.arc(0, 0, fish.size * 0.8, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Tiny curled tail
                this.ctx.beginPath();
                this.ctx.arc(-fish.size * 0.8, fish.size * 0.2 + Math.sin(fish.swimCycle)*2, fish.size * 0.4, 0, Math.PI * 2);
                this.ctx.fill();

                // Species Patterns
                if (fish.id === 'crs_shrimp') {
                    this.ctx.fillStyle = 'white';
                    this.ctx.fillRect(-fish.size * 0.2, -fish.size * 0.8, fish.size * 0.4, fish.size * 1.6);
                } else if (fish.id === 'blue_shrimp') {
                    this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
                    this.ctx.beginPath(); this.ctx.arc(0, 0, fish.size * 0.5, 0, Math.PI*2); this.ctx.fill();
                }

                // Pulsing Rosy Cheeks
                this.ctx.fillStyle = `rgba(255, 182, 193, ${0.4 + Math.sin(timestamp * 0.01) * 0.2})`;
                this.ctx.beginPath();
                this.ctx.arc(fish.size * 0.4, fish.size * 0.2, fish.size * 0.25, 0, Math.PI * 2);
                this.ctx.fill();

                // Tiny Smile
                this.ctx.strokeStyle = '#1e293b';
                this.ctx.lineWidth = 1.5;
                this.ctx.beginPath();
                this.ctx.arc(fish.size * 0.6, fish.size * 0.1, fish.size * 0.15, 0.1 * Math.PI, 0.9 * Math.PI);
                this.ctx.stroke();

                // Expressive Antennae
                this.ctx.strokeStyle = fish.color;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(fish.size * 0.5, -fish.size * 0.4);
                this.ctx.quadraticCurveTo(fish.size * 2.5, -fish.size * 1.5 + Math.sin(fish.swimCycle)*10, fish.size * 3.5, -fish.size * 0.5);
                this.ctx.stroke();

                // Huge Sparkly Eyes
                this.ctx.fillStyle = 'white';
                this.ctx.beginPath();
                this.ctx.arc(fish.size * 0.5, -fish.size * 0.4, fish.size * 0.4, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.fillStyle = '#1e293b';
                this.ctx.beginPath();
                this.ctx.arc(fish.size * 0.6, -fish.size * 0.4, fish.size * 0.25, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.fillStyle = 'white';
                this.ctx.beginPath();
                this.ctx.arc(fish.size * 0.65, -fish.size * 0.5, fish.size * 0.12, 0, Math.PI * 2);
                this.ctx.fill();

            } else if (fish.shape === 'snail') {
                // ULTRA KAWAII SNAIL (Mochi Style)
                this.ctx.beginPath();
                this.ctx.ellipse(0, 4, fish.size * 1.4, fish.size * 0.5, 0, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Big Round Shell
                this.ctx.beginPath(); 
                this.ctx.arc(-2, -fish.size * 0.3, fish.size * 1.2, 0, Math.PI * 2); 
                this.ctx.fill();
                
                // Shell Pattern
                this.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                this.ctx.lineWidth = 4;
                this.ctx.beginPath();
                this.ctx.arc(-2, -fish.size * 0.3, fish.size * 0.7, 0, Math.PI * 1.8);
                this.ctx.stroke();

                // Tiny Flower on Shell
                this.ctx.fillStyle = '#f472b6';
                this.ctx.beginPath();
                this.ctx.arc(-fish.size * 0.5, -fish.size * 1.2, fish.size * 0.2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.fillStyle = '#fbbf24';
                this.ctx.beginPath();
                this.ctx.arc(-fish.size * 0.5, -fish.size * 1.2, fish.size * 0.08, 0, Math.PI * 2);
                this.ctx.fill();

                // Face on the foot
                this.ctx.fillStyle = `rgba(255, 182, 193, 0.5)`;
                this.ctx.beginPath();
                this.ctx.arc(fish.size * 0.8, 2, fish.size * 0.2, 0, Math.PI * 2);
                this.ctx.fill();

                // Tiny Mouth
                this.ctx.strokeStyle = '#1e293b';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.arc(fish.size * 1.0, 3, fish.size * 0.1, 0, Math.PI);
                this.ctx.stroke();

                // Wobbly Eyes
                const stalkSway = Math.sin(timestamp * 0.003) * 3;
                this.ctx.strokeStyle = fish.color;
                this.ctx.lineWidth = 3;
                [0.6, 1.0].forEach((xPos, i) => {
                    const sway = i === 0 ? stalkSway : -stalkSway;
                    this.ctx.beginPath();
                    this.ctx.moveTo(fish.size * xPos, 0);
                    this.ctx.lineTo(fish.size * (xPos + 0.2) + sway, -fish.size * 1.2);
                    this.ctx.stroke();
                    this.ctx.fillStyle = 'white';
                    this.ctx.beginPath();
                    this.ctx.arc(fish.size * (xPos + 0.2) + sway, -fish.size * 1.2, fish.size * 0.3, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.fillStyle = '#1e293b';
                    this.ctx.beginPath();
                    this.ctx.arc(fish.size * (xPos + 0.25) + sway, -fish.size * 1.2, fish.size * 0.15, 0, Math.PI * 2);
                    this.ctx.fill();
                });

            } else {
                // ULTRA KAWAII FISH (Chibi Proportions)
                let bodyW = fish.size * 1.3;
                let bodyH = fish.size * 1.1;
                let tailSway = Math.sin(fish.swimCycle) * (fish.size * 0.6);

                // Unique Silhouettes
                if (fish.id === 'goldfish') { bodyW = fish.size * 1.5; bodyH = fish.size * 1.5; }
                if (fish.id === 'tetra') { bodyW = fish.size * 1.6; bodyH = fish.size * 0.6; }
                if (fish.id === 'angelfish') { bodyW = fish.size * 0.8; bodyH = fish.size * 1.8; }
                if (fish.id === 'discus') { bodyW = fish.size * 1.6; bodyH = fish.size * 1.6; }
                if (fish.id === 'betta') { bodyW = fish.size * 1.2; bodyH = fish.size * 1.0; }

                // 1. Draw Tail
                this.ctx.beginPath();
                if (fish.id === 'betta') {
                    // Huge Flowing Gown Tail
                    this.ctx.moveTo(-bodyW * 0.3, 0);
                    this.ctx.bezierCurveTo(-bodyW * 3, -fish.size * 2.5 + tailSway, -bodyW * 4, tailSway, -bodyW * 3, fish.size * 2.5 + tailSway);
                } else if (fish.id === 'angelfish') {
                    // Long Streamers
                    this.ctx.moveTo(-bodyW * 0.5, 0);
                    this.ctx.lineTo(-bodyW * 2.5, -fish.size + tailSway);
                    this.ctx.lineTo(-bodyW * 0.8, 0);
                    this.ctx.lineTo(-bodyW * 2.5, fish.size + tailSway);
                } else {
                    // Round Heart Tail
                    this.ctx.moveTo(-bodyW * 0.3, 0);
                    this.ctx.bezierCurveTo(-bodyW * 1.5, -bodyH + tailSway, -bodyW * 2, 0, -bodyW * 1.5, bodyH + tailSway);
                }
                this.ctx.fill();

                // 2. Draw Body
                this.ctx.beginPath();
                if (fish.id === 'angelfish') {
                    // Triangle Body
                    this.ctx.moveTo(bodyW * 0.8, 0);
                    this.ctx.lineTo(-bodyW * 0.5, -bodyH);
                    this.ctx.lineTo(-bodyW * 0.5, bodyH);
                } else {
                    this.ctx.ellipse(0, 0, bodyW, bodyH, 0, 0, Math.PI * 2);
                }
                this.ctx.fill();

                // 3. Species Patterns (Enhanced)
                if (fish.id === 'tetra') {
                    this.ctx.shadowBlur = 15; this.ctx.shadowColor = '#0ea5e9';
                    this.ctx.fillStyle = '#38bdf8';
                    this.ctx.fillRect(-bodyW * 0.5, -2, bodyW * 1.2, 4);
                    this.ctx.shadowBlur = 0;
                    // Neon Heart
                    if (Math.sin(timestamp * 0.01) > 0.8) {
                        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                        this.ctx.font = '12px Arial';
                        this.ctx.fillText('❤️', bodyW * 0.2, -bodyH * 0.5);
                    }
                } else if (fish.id === 'cory') {
                    this.ctx.fillStyle = '#1e293b';
                    this.ctx.beginPath(); this.ctx.arc(bodyW * 0.4, -bodyH * 0.2, bodyW * 0.4, 0, Math.PI*2); this.ctx.fill();
                    // Tiny Panda Ears (Fins)
                    this.ctx.beginPath(); this.ctx.arc(-bodyW * 0.2, -bodyH * 0.8, bodyW * 0.3, 0, Math.PI*2); this.ctx.fill();
                } else if (fish.id === 'piranha') {
                    this.ctx.fillStyle = '#ef4444';
                    this.ctx.beginPath(); this.ctx.arc(0, bodyH * 0.4, bodyW * 0.7, 0, Math.PI, false); this.ctx.fill();
                    // Angry but cute eyebrow
                    this.ctx.strokeStyle = '#1e293b'; this.ctx.lineWidth = 2;
                    this.ctx.beginPath(); this.ctx.moveTo(bodyW * 0.3, -bodyH * 0.6); this.ctx.lineTo(bodyW * 0.7, -bodyH * 0.4); this.ctx.stroke();
                    // Angry Vein
                    this.ctx.fillStyle = '#ef4444';
                    this.ctx.font = 'bold 14px Arial';
                    this.ctx.fillText('💢', -bodyW * 0.5, -bodyH * 0.8);
                } else if (fish.id === 'discus') {
                    // Royal Crown for Discus
                    this.ctx.fillStyle = '#fbbf24';
                    this.ctx.beginPath();
                    this.ctx.moveTo(-bodyW * 0.2, -bodyH);
                    this.ctx.lineTo(-bodyW * 0.3, -bodyH - 15);
                    this.ctx.lineTo(-bodyW * 0.1, -bodyH - 8);
                    this.ctx.lineTo(0, -bodyH - 18);
                    this.ctx.lineTo(bodyW * 0.1, -bodyH - 8);
                    this.ctx.lineTo(bodyW * 0.3, -bodyH - 15);
                    this.ctx.lineTo(bodyW * 0.2, -bodyH);
                    this.ctx.fill();
                } else if (fish.id === 'guppy') {
                    // Pink Bow for Guppy
                    this.ctx.fillStyle = '#f472b6';
                    this.ctx.beginPath();
                    this.ctx.arc(-bodyW * 0.2, -bodyH * 0.8, 5, 0, Math.PI*2);
                    this.ctx.fill();
                    this.ctx.beginPath();
                    this.ctx.moveTo(-bodyW * 0.2, -bodyH * 0.8);
                    this.ctx.lineTo(-bodyW * 0.4, -bodyH * 1.0);
                    this.ctx.lineTo(-bodyW * 0.4, -bodyH * 0.6);
                    this.ctx.fill();
                    this.ctx.beginPath();
                    this.ctx.moveTo(-bodyW * 0.2, -bodyH * 0.8);
                    this.ctx.lineTo(0, -bodyH * 1.0);
                    this.ctx.lineTo(0, -bodyH * 0.6);
                    this.ctx.fill();
                }

                // 4. Face (Ultra Kawaii)
                // Pulsing Blush
                this.ctx.fillStyle = `rgba(255, 182, 193, ${0.4 + Math.sin(timestamp * 0.01) * 0.2})`;
                this.ctx.beginPath();
                this.ctx.arc(bodyW * 0.4, bodyH * 0.2, bodyW * 0.25, 0, Math.PI * 2);
                this.ctx.fill();

                // Tiny Smile (ω shape)
                this.ctx.strokeStyle = '#1e293b';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(bodyW * 0.7, bodyH * 0.1, bodyW * 0.1, 0, Math.PI);
                this.ctx.stroke();

                // Huge Sparkly Eyes
                if (!fish.isDead) {
                    const eyeSize = fish.size * 0.5;
                    this.ctx.fillStyle = 'white';
                    this.ctx.beginPath();
                    this.ctx.arc(bodyW * 0.6, -bodyH * 0.2, eyeSize, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.fillStyle = '#1e293b';
                    this.ctx.beginPath();
                    this.ctx.arc(bodyW * 0.7, -bodyH * 0.2, eyeSize * 0.7, 0, Math.PI * 2);
                    this.ctx.fill();
                    // Double Sparkle
                    this.ctx.fillStyle = 'white';
                    this.ctx.beginPath();
                    this.ctx.arc(bodyW * 0.75, -bodyH * 0.3, eyeSize * 0.3, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.beginPath();
                    this.ctx.arc(bodyW * 0.65, -bodyH * 0.1, eyeSize * 0.15, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                
                // Happy Particles (Sparkles)
                if (fish.hunger < 50 && Math.random() < 0.02 && timeScale > 0) {
                    this.ctx.fillStyle = '#fde047';
                    this.ctx.beginPath();
                    this.ctx.arc(Math.random()*bodyW*2 - bodyW, -bodyH - Math.random()*20, 2, 0, Math.PI*2);
                    this.ctx.fill();
                }
            }
            this.ctx.restore();
        }

        if(this.actionTextTimer > 0) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, this.actionTextTimer / 20)})`;
            this.ctx.font = '900 32px "Noto Sans TC"'; this.ctx.textAlign = 'center';
            this.ctx.fillText(this.actionText, this.canvas.width/2, this.canvas.height/2 - (90 - this.actionTextTimer)*0.5);
            this.actionTextTimer -= (timeScale > 0) ? timeScale : 1; 
        }
        if(this.isRunning) this.animFrameId = requestAnimationFrame((t) => this.renderLoop(t));
    }
}
