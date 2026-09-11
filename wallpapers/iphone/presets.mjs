// Native portrait pixels, verified against Apple's technical specifications.
// https://www.apple.com/iphone-17-pro/specs/
// https://www.apple.com/iphone-air/specs/
export const iphonePresets=[
 {id:'iphone17pro',label:'iPhone 17 Pro',width:1206,height:2622},
 {id:'iphone17promax',label:'iPhone 17 Pro Max',width:1320,height:2868},
 {id:'iphoneair',label:'iPhone Air',width:1260,height:2736},
];
export function normalizeSize(value){return value==='full'?'iphone17promax':value;}
