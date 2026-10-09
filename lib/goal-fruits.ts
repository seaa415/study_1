export const fruits=[{name:'포도',icon:'🍇'},{name:'복숭아',icon:'🍑'},{name:'사과',icon:'🍎'},{name:'귤',icon:'🍊'},{name:'돈',icon:'💰'},{name:'체리',icon:'🍒'},{name:'하트',icon:'💗'},{name:'별',icon:'⭐'}] as const;
export function fruitFor(seed:string){let hash=2166136261;for(const char of seed){hash^=char.codePointAt(0)||0;hash=Math.imul(hash,16777619)}return fruits[(hash>>>0)%fruits.length]}
