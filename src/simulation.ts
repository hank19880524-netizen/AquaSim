import { FISH_DB, SHRIMP_DB, SNAIL_DB, PLANT_DB, EQUIP_DB, MEDIA_DB } from './constants';
import { Fish, Plant, PipelineNode, WaterStats, SystemStats, SaveData } from './types';

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
    lastTime: number | null;
    simInterval: any;
    animFrameId: number;
    onUpdateUI: (sim: AquariumSimulation) => void;

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
    }

    stop() {
        this.isRunning = false;
        clearInterval(this.simInterval);
        cancelAnimationFrame(this.animFrameId);
    }

    generateId() { return Math.random().toString(36).substr(2, 9); }

    showActionText(text: string) { this.actionText = text; this.actionTextTimer = 90; }

    feed() { 
        if (this.money < 2) return;
        this.money -= 2;
        this.water.food += 10; 
        for(let i=0;i<10;i++) this.foodParticles.push({ x: Math.random()*(this.canvas.width-100)+50, y: -10 - Math.random()*30, vy: 0.8 + Math.random()*1.0 });
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

    spawnFish(id: string) {
        const f = FISH_DB.find(x => x.id === id) || SHRIMP_DB.find(x => x.id === id) || SNAIL_DB.find(x => x.id === id); 
        if(!f) return;
        this.fishes.push({
            ...f, 
            x: Math.random()*(this.canvas.width-100)+50, 
            y: Math.random()*(this.canvas.height-150)+50, 
            vx: 0, vy: 0, 
            targetVx: (Math.random()-0.5)*3, 
            targetVy: (Math.random()-0.5)*1, 
            swimCycle: Math.random() * Math.PI * 2, 
            health: 100, isDead: false, hunger: 0, 
            targetY: f.shape==='bottom'||f.shape==='shrimp'||f.shape==='snail'?this.canvas.height-30:null 
        });
    }

    spawnPlant(id: string, x: number) {
        const p = PLANT_DB.find(px => px.id === id);
        if(p) this.plants.push({ ...p, x: x, height: 30+Math.random()*30 });
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
            if(this.water.food > 0 && fish.hunger > 60) { this.water.food -= 1; fish.hunger = 0; fish.health = Math.min(100, fish.health + 5); }

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
                    if(plant.height < plant.maxH) plant.height += 0.5 * gm;
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
        let algaeRatio = this.water.algae / 100;
        const waterHeight = this.canvas.height * (this.water.level / 100);
        const waterY = this.canvas.height - waterHeight;
        
        this.ctx.fillStyle = `rgba(${100 - algaeRatio*60}, ${190 + algaeRatio*30}, ${240 - algaeRatio*140}, ${0.3 + algaeRatio*0.4})`;
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
            this.ctx.fillStyle = `rgba(255, 255, 255, ${0.05 - algaeRatio*0.04})`; 
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
                    this.ctx.beginPath(); this.ctx.moveTo(lx, ly); this.ctx.lineTo(lx + (Math.random()-0.5)*15, ly - Math.random()*10); this.ctx.lineWidth = 2; this.ctx.stroke();
                }
            } else {
                this.ctx.lineWidth = 3; this.ctx.beginPath(); this.ctx.moveTo(plant.x, this.canvas.height - 20);
                this.ctx.bezierCurveTo(plant.x + swayMid, this.canvas.height - actualHeight*0.3, plant.x + swayTop*0.5, this.canvas.height - actualHeight*0.6, plant.x + swayTop, this.canvas.height - actualHeight);
                this.ctx.stroke();
                for(let i=1; i<=plant.leaves; i++) {
                    let t = i / plant.leaves; let leafY = this.canvas.height - 20 - (actualHeight * t); let currentSway = swayTop * t;
                    let leafWobble = (timeScale > 0) ? Math.sin(timestamp * 0.002 + plant.x + i) * 0.2 : 0;
                    let leafSize = plant.shape === 'broad' ? 14 : 6; let dir = i % 2 === 0 ? 1 : -1;
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

        this.ctx.fillStyle = '#b45309';
        for(let i = this.foodParticles.length - 1; i >= 0; i--) {
            let f = this.foodParticles[i];
            if(f.y < waterY) f.y += f.vy * 2 * timeScale; else if(f.y < this.canvas.height - 25) f.y += f.vy * timeScale; else f.y = this.canvas.height - 25; 
            this.ctx.beginPath(); this.ctx.arc(f.x, f.y, 2, 0, Math.PI * 2); this.ctx.fill();
        }

        for(let fish of this.fishes) {
            let topBound = waterY + 15; let bottomBound = this.canvas.height - 30;
            if(!fish.isDead) {
                fish.vx += (fish.targetVx - fish.vx) * 0.05 * timeScale; fish.vy += (fish.targetVy - fish.vy) * 0.05 * timeScale;
                fish.x += fish.vx * timeScale; fish.y += fish.vy * timeScale; fish.swimCycle += 0.15 * Math.max(0.5, Math.abs(fish.vx)) * timeScale;
                if(fish.x < 30) { fish.targetVx = Math.abs(fish.targetVx); fish.vx += 0.2; }
                if(fish.x > this.canvas.width - 30) { fish.targetVx = -Math.abs(fish.targetVx); fish.vx -= 0.2; }
                if(fish.shape !== 'shrimp' && fish.shape !== 'snail') {
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
            if(!fish.isDead) {
                let tilt = (fish.shape !== 'shrimp' && fish.shape !== 'snail') ? Math.atan2(fish.vy, Math.max(0.1, Math.abs(fish.vx))) * 0.7 : 0;
                if(fish.tilt === undefined) fish.tilt = 0; fish.tilt += (tilt - fish.tilt) * 0.1 * timeScale;
                if (fish.vx < 0) { this.ctx.scale(-1, 1); this.ctx.rotate(-fish.tilt); } else { this.ctx.rotate(fish.tilt); }
            } else { this.ctx.rotate(Math.PI); }
            this.ctx.fillStyle = fish.color;
            if (fish.shape === 'shrimp') {
                this.ctx.beginPath(); this.ctx.arc(0, -2, fish.size*0.6, 0, Math.PI*2); this.ctx.arc(-fish.size*0.7, -fish.size*0.3, fish.size*0.5, 0, Math.PI*2); this.ctx.arc(-fish.size*1.3, Math.sin(fish.swimCycle)*2, fish.size*0.4, 0, Math.PI*2); this.ctx.fill();
            } else if (fish.shape === 'snail') {
                this.ctx.beginPath(); this.ctx.arc(0, -fish.size*0.2, fish.size, Math.PI, 0); this.ctx.fill();
            } else {
                this.ctx.beginPath(); let tailSway = !fish.isDead ? Math.sin(fish.swimCycle) * (fish.size * 0.4) : 0;
                this.ctx.moveTo(-fish.size*0.5, 0); this.ctx.quadraticCurveTo(-fish.size*1.5, -fish.size + tailSway, -fish.size*1.5, tailSway); this.ctx.quadraticCurveTo(-fish.size*1.5, fish.size + tailSway, -fish.size*0.5, 0); this.ctx.fill();
                this.ctx.beginPath(); this.ctx.ellipse(0, 0, Math.max(0.1, fish.size * 1.1), Math.max(0.1, fish.size * 0.8), 0, 0, Math.PI * 2); this.ctx.fill();
                if (!fish.isDead) {
                    this.ctx.fillStyle = 'white'; this.ctx.beginPath(); this.ctx.arc(fish.size * 0.4, -fish.size * 0.2, Math.max(0.1, fish.size * 0.3), 0, Math.PI * 2); this.ctx.fill();
                    this.ctx.fillStyle = '#1e293b'; this.ctx.beginPath(); this.ctx.arc(fish.size * 0.5, -fish.size * 0.2, Math.max(0.1, fish.size * 0.15), 0, Math.PI * 2); this.ctx.fill();
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
