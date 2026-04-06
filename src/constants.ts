export const FISH_DB = [
    { id: 'guppy', name: '孔雀魚', cost: 10, size: 32, bioLoad: 1.0, color: '#f97316', shape: 'normal', desc: '好養，適應力強' },
    { id: 'tetra', name: '紅蓮燈', cost: 15, size: 24, bioLoad: 0.8, color: '#ef4444', shape: 'slim', desc: '水草缸絕配，體型小' },
    { id: 'goldfish', name: '小金魚', cost: 20, size: 56, bioLoad: 5.0, color: '#fbbf24', shape: 'round', desc: '超級吃貨，高污染！' },
    { id: 'cory', name: '熊貓鼠', cost: 25, size: 36, bioLoad: 1.5, color: '#fef08a', shape: 'bottom', desc: '底棲魚，清理殘餌' },
    { id: 'pleco', name: '小精靈', cost: 30, size: 36, bioLoad: 1.2, color: '#4b5563', shape: 'bottom', desc: '底棲，喜歡吃藻類' },
    { id: 'betta', name: '鬥魚', cost: 50, size: 48, bioLoad: 1.5, color: '#3b82f6', shape: 'flowing', desc: '美麗但怕強水流' },
    { id: 'angelfish', name: '神仙魚', cost: 60, size: 64, bioLoad: 3.0, color: '#e2e8f0', shape: 'tall', desc: '優雅的側扁體型' },
    { id: 'zebra', name: '斑馬魚', cost: 12, size: 28, bioLoad: 0.9, color: '#d946ef', shape: 'slim', desc: '極度活潑，群游性強' },
    { id: 'molly', name: '黑茉莉', cost: 18, size: 40, bioLoad: 1.5, color: '#1e293b', shape: 'normal', desc: '會吃水面油膜與微小藻類' },
    { id: 'swordtail', name: '紅劍魚', cost: 22, size: 44, bioLoad: 1.6, color: '#dc2626', shape: 'slim', desc: '尾部有標誌性劍狀延伸' },
    { id: 'discus', name: '七彩神仙', cost: 150, size: 72, bioLoad: 4.5, color: '#0ea5e9', shape: 'round', desc: '熱帶魚之王，飼養難度高' },
    { id: 'piranha', name: '紅腹食人魚', cost: 120, size: 52, bioLoad: 4.0, color: '#ef4444', shape: 'normal', desc: '極度兇猛，會獵食缸內其他魚蝦' }
];

export const SHRIMP_DB = [
    { id: 'cherry_shrimp', name: '極火蝦', cost: 10, size: 20, bioLoad: 0.2, color: '#ef4444', shape: 'shrimp', desc: '紅通通的小型除藻蝦' },
    { id: 'amano_shrimp', name: '大和藻蝦', cost: 18, size: 28, bioLoad: 0.3, color: '#a8a29e', shape: 'shrimp', desc: '除藻能力極強的大型蝦' },
    { id: 'crs_shrimp', name: '水晶蝦', cost: 60, size: 20, bioLoad: 0.2, color: '#f8fafc', shape: 'shrimp', desc: '紅白相間，對水質極敏感' },
    { id: 'yellow_shrimp', name: '黃金米蝦', cost: 12, size: 24, bioLoad: 0.2, color: '#eab308', shape: 'shrimp', desc: '金黃亮眼，清理底砂殘餌' },
    { id: 'blue_shrimp', name: '藍絲絨蝦', cost: 20, size: 20, bioLoad: 0.2, color: '#3b82f6', shape: 'shrimp', desc: '夢幻藍色的高階米蝦' }
];

export const SNAIL_DB = [
    { id: 'apple_snail', name: '蘋果螺', cost: 5, size: 28, bioLoad: 0.5, color: '#f87171', shape: 'snail', desc: '吃殘餌與微小藻類，容易爆殖' },
    { id: 'nerite_snail', name: '蜜蜂角螺', cost: 15, size: 24, bioLoad: 0.2, color: '#eab308', shape: 'snail', desc: '最強除藻螺，黑黃相間不繁殖' },
    { id: 'ramshorn', name: '斑馬螺', cost: 10, size: 28, bioLoad: 0.3, color: '#a8a29e', shape: 'snail', desc: '除缸壁綠斑藻效果好' }
];

export const PLANT_DB = [
    { id: 'anubias', name: '小榕', cost: 15, maxH: 80, leaves: 4, color: '#166534', shape: 'broad', nAbsorb: 0.5, desc: '極度耐陰，生長緩慢' },
    { id: 'javafern', name: '鐵皇冠', cost: 20, maxH: 120, leaves: 6, color: '#15803d', shape: 'long', nAbsorb: 0.8, desc: '蕨類，生長強健' },
    { id: 'sword', name: '皇冠草', cost: 35, maxH: 250, leaves: 8, color: '#22c55e', shape: 'broad', nAbsorb: 1.5, desc: '大型水草，根系發達' },
    { id: 'vallisneria', name: '水蘭', cost: 15, maxH: 350, leaves: 3, color: '#4ade80', shape: 'grass', nAbsorb: 1.2, desc: '草皮狀，極速長高' },
    { id: 'crypt', name: '椒草', cost: 25, maxH: 100, leaves: 5, color: '#854d0e', shape: 'broad', nAbsorb: 0.7, desc: '偏暗褐色，適應力強' },
    { id: 'hornwort', name: '金魚藻', cost: 10, maxH: 300, leaves: 12, color: '#4ade80', shape: 'bushy', nAbsorb: 3.0, desc: '吸硝酸鹽神器，爆殖' },
    { id: 'rotala', name: '綠菊', cost: 20, maxH: 200, leaves: 10, color: '#86efac', shape: 'bushy', nAbsorb: 1.8, desc: '美麗的後景莖面草' },
    { id: 'ludwigia', name: '小紅莓', cost: 40, maxH: 180, leaves: 8, color: '#f43f5e', shape: 'bushy', nAbsorb: 1.2, desc: '水草紅色的視覺亮點' },
    { id: 'moss', name: '莫絲', cost: 15, maxH: 30, leaves: 15, color: '#14532d', shape: 'carpet', nAbsorb: 0.5, desc: '前景草皮，蝦子最愛' },
    { id: 'sprite', name: '水妖精草', cost: 25, maxH: 220, leaves: 9, color: '#22c55e', shape: 'bushy', nAbsorb: 2.0, desc: '生長迅速的羽狀葉' }
];

export const DECOR_DB = [
    { id: 'rock_1', name: '青龍石', cost: 30, type: 'rock', color: '#64748b', desc: '經典造景石，會微升硬度' },
    { id: 'rock_2', name: '火山岩', cost: 20, type: 'rock', color: '#450a0a', desc: '多孔隙，利於硝化菌附著' },
    { id: 'wood_1', name: '沉木', cost: 45, type: 'wood', color: '#422006', desc: '釋放單寧酸，微降 pH' },
    { id: 'wood_2', name: '杜鵑根', cost: 55, type: 'wood', color: '#78350f', desc: '造型優美，適合附生植物' },
    { id: 'ornament_1', name: '沈船', cost: 100, type: 'ornament', color: '#334155', desc: '神祕的海底遺跡' },
    { id: 'ornament_2', name: '寶箱', cost: 80, type: 'ornament', color: '#ca8a04', desc: '會不斷冒出氣泡' }
];

export const FEEDER_UPGRADES = [
    { level: 0, name: '手動餵食', cost: 0, amount: 10, desc: '每次點擊投放 10 單位飼料' },
    { level: 1, name: '高效飼料', cost: 100, amount: 30, desc: '每次點擊投放 30 單位飼料' },
    { level: 2, name: '自動餵食器', cost: 300, amount: 5, desc: '每小時自動投放 5 單位飼料' },
    { level: 3, name: '智能投餵系統', cost: 800, amount: 15, desc: '每小時自動投放 15 單位飼料' }
];

export const EQUIP_DB: any = {
    'intake': { name: '入水口', type: 'pipe', icon: 'fa-turn-down', maxSlots: 0, maxFlow: 0, cost: 5, desc: '起點抽水' },
    'hose': { name: '軟管', type: 'pipe', icon: 'fa-wave-square', maxSlots: 0, maxFlow: 0, cost: 3, desc: '連接彎折' },
    'pipe': { name: '硬管', type: 'pipe', icon: 'fa-ruler-horizontal', maxSlots: 0, maxFlow: 0, cost: 2, desc: '連接空隙' },
    'co2_diffuser': { name: 'CO2 細化器', type: 'filter', icon: 'fa-smog', maxSlots: 0, maxFlow: 0, cost: 80, desc: '打入碳源' },
    'sponge': { name: '水妖精', type: 'filter', icon: 'fa-filter', maxSlots: 1, maxFlow: 1.0, cost: 20, desc: '氣動過濾' },
    'hob': { name: '外掛過濾', type: 'filter', icon: 'fa-box', maxSlots: 2, maxFlow: 2.5, cost: 50, desc: '瀑布效應' },
    'prefilter': { name: '前置', type: 'filter', icon: 'fa-database', maxSlots: 3, maxFlow: 0, cost: 60, desc: '擴充濾材' },
    'canister': { name: '圓筒過濾', type: 'filter', icon: 'fa-car-battery', maxSlots: 4, maxFlow: 5.0, cost: 150, desc: '核心動力' },
    'outflow': { name: '出水口', type: 'pipe', icon: 'fa-shower', maxSlots: 0, maxFlow: 0, cost: 5, desc: '終點回流' }
};

export const MEDIA_DB: any = {
    'empty': { name: '- 選擇濾材 -', bio: 0, mech: 0, cost: 0, color: 'text-slate-500' },
    'floss': { name: '過濾白棉', bio: 5, mech: 0.30, cost: 5, color: 'text-white', dirtRate: 2.0 }, 
    'sponge': { name: '生化過濾棉', bio: 20, mech: 0.10, cost: 10, color: 'text-blue-300', dirtRate: 0.5 },
    'ceramic': { name: '多孔陶瓷環', bio: 40, mech: 0.02, cost: 15, color: 'text-orange-200', dirtRate: 0.1 } 
};
