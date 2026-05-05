'use strict';
const DEFAULT_CATS=[
  {e:'🍜',l:'Food & Dining',c:'#FF6B6B'},{e:'🛒',l:'Groceries',c:'#4ECDC4'},
  {e:'🚌',l:'Transport',c:'#45B7D1'},{e:'🏠',l:'Rent & Housing',c:'#96CEB4'},
  {e:'💡',l:'Utilities',c:'#FFEAA7'},{e:'🎬',l:'Entertainment',c:'#DDA0DD'},
  {e:'👕',l:'Shopping',c:'#98FB98'},{e:'💊',l:'Healthcare',c:'#F0E68C'},
  {e:'✈️',l:'Travel',c:'#87CEEB'},{e:'🍺',l:'Drinks',c:'#FFDAB9'},
  {e:'🎁',l:'Gifts',c:'#E6E6FA'},{e:'🏋️',l:'Fitness',c:'#B0E0E6'},
  {e:'📱',l:'Phone & Internet',c:'#FFB347'},{e:'💰',l:'Other',c:'#D3D3D3'},
];
const SPLITS=['Equal','Custom %','Payer only'];
const CURRENCIES=['SGD','USD','GBP','EUR','MYR','AUD','JPY','THB','IDR','HKD'];
const GRP_EMOJIS=['🏠','✈️','🎉','💼','🍺','🏋️','🎓','❤️','🌴','💰','🏖️','🎮','🐾','🎵'];
const GRP_COLORS=['#7c6fee','#ef4444','#22c55e','#f59e0b','#06b6d4','#ec4899','#8b5cf6','#f97316','#14b8a6','#a855f7'];
