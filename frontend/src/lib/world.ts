// @ts-nocheck
/* Markup for the landing film: the animated SVG "world" and the floating widgets.
   Generated from the original design; ids are used by Film.tsx to animate them. */
import { initialYard } from './data'

export function worldMarkup(): string {
  const Y = initialYard()
  let w="";const X=(x,y,wd,h,o,f)=>`<rect x="${x}" y="${y}" width="${wd}" height="${h}" rx="3" fill="${f||"var(--fg)"}" opacity="${o}"/>`;
  w+=X(0,450,4400,300,.08)+X(0,330,900,420,.14);for(let i=0;i<9;i++)w+=`<path d="M${40+i*95} ${380+(i%3)*30}q25-12 50 0t50 0" stroke="var(--fg)" fill="none" opacity=".25"/>`;
  w+=X(90,340,430,70,.5)+X(500,355,20,55,.5);for(let i=0;i<7;i++)for(let j=0;j<2;j++)w+=X(110+i*58,300-j*30+10,54,28,.28+((i+j)%3)*.1);
  w+=`<path d="M250 330V120H520" stroke="var(--fg)" stroke-width="6" fill="none" opacity=".6"/><path d="M520 120V250" stroke="var(--lime)" stroke-width="3"/>`;
  w+=X(900,452,1300,6,.5)+X(900,470,1300,4,.3)+`<path d="M900 440H2150" stroke="var(--fg)" stroke-dasharray="14 18" opacity=".3"/>`;
  w+=X(1920,300,14,160,.6)+X(2010,300,14,160,.6)+`<rect id="bar" x="1934" y="318" width="110" height="9" fill="var(--lime)" style="transform-origin:1934px 322px"/>`;
  w+=X(2200,290,280,170,.22)+X(2210,280,260,14,.6);for(let i=0;i<4;i++)w+=X(2230+i*60,320,36,50,.3);w+=`<text id="clr" x="2260" y="425" fill="var(--lime)" font-weight="800" font-size="26" opacity="0">CLEARED</text>`;
  w+=`<path d="M2640 460V210M3490 460V210M2620 210H3510" stroke="var(--fg)" stroke-width="7" fill="none" opacity=".55"/><rect id="tr" x="2700" y="212" width="40" height="22" fill="var(--lime)"/>`;
  Y.forEach((s,c)=>s.forEach((v,t)=>{if(c==2&&t==0)return;const bl=c==2;w+=`<rect class="${bl?"blk":""}" x="${2650+c*100}" y="${450-34*(t+1)}" width="80" height="32" rx="3" fill="var(--fg)" opacity="${.22+(c*3+t)%4*.08}"/>`}));
  w+=`<rect id="ring" x="3244" y="382" width="92" height="40" rx="5" fill="none" stroke="var(--lime)" stroke-width="4" opacity="0"/>`+[[2,"0.31"],[4,"0.58"],[6,"0.97"]].map(([c,s])=>`<text class="sc" x="${2650+c*100}" y="300" fill="var(--fg)" font-size="22" opacity="0">${s}</text>`).join("");
  w+=`<path id="ap" d="M2640 478H3290V430" pathLength="1" stroke="var(--lime)" stroke-width="6" fill="none" stroke-dasharray="1" stroke-dashoffset="1" stroke-linecap="round"/>`;
  w+=X(3560,452,840,6,.5)+`<g id="trk"><rect x="-6" y="426" width="100" height="26" fill="var(--fg)" opacity=".6"/><rect x="94" y="406" width="44" height="46" rx="4" fill="var(--fg)" opacity=".8"/><circle cx="20" cy="454" r="10" fill="var(--bg)" stroke="var(--fg)" stroke-width="4"/><circle cx="110" cy="454" r="10" fill="var(--bg)" stroke="var(--fg)" stroke-width="4"/></g>`;
  w+=`<g id="gmt"><rect width="88" height="38" rx="4" fill="var(--lime)" style="filter:drop-shadow(0 0 14px rgba(198,241,53,.7))"/><text x="44" y="24" text-anchor="middle" font-size="13" font-weight="800" fill="#0A0B0A">GMT-0042</text></g>`;
  w+=`<g id="wk"><circle cx="0" cy="-60" r="9" fill="var(--fg)"/><path d="M-11 -63a11 11 0 0 1 22 0z" fill="var(--lime)"/><rect x="-10" y="-50" width="20" height="30" rx="6" fill="var(--lime)"/><rect x="-9" y="-20" width="7" height="20" fill="var(--fg)" opacity=".85"/><rect x="2" y="-20" width="7" height="20" fill="var(--fg)" opacity=".85"/><path id="arm" d="M10 -44l16 0" stroke="var(--fg)" stroke-width="5" stroke-linecap="round"/><path d="M-10 -44l-12 10" stroke="var(--fg)" stroke-width="5" stroke-linecap="round"/></g>`;
  return w
}

/** Camera keyframes: K = [x, width] of the SVG viewBox, W = [x, y] of the container. */
export const K: number[][] = [[420,1000],[1150,1000],[1800,900],[2300,900],[2900,820],[3100,780],[3100,780],[3100,860],[3700,1000],[4000,1000]];
export const W: number[][] = [[330,300],[1100,414],[1700,414],[2220,414],[2847,414],[3247,381],[3247,381],[3247,381],[3700,414],[4050,414]];

const gs = ()=>{let o='';const ob=[12,13,22,23,32,33,17,27,37,45,46];for(let k=0;k<60;k++){const x=k%10,y=k/10|0;o+=`<rect x='${x*28+4}' y='${y*28+4}' width='24' height='24' rx='3' fill='currentColor' opacity='${ob.includes(k)?.65:.12}'/>`}return o};
export const WG: string[] = [
`<div class='wh'><span>Vessel tracker</span><em>live</em></div><svg viewBox='0 0 200 200' style='width:100%;max-height:260px' aria-hidden='true'><g fill='none' stroke='currentColor' opacity='.25'><circle cx='100' cy='100' r='90'/><circle cx='100' cy='100' r='60'/><circle cx='100' cy='100' r='30'/><path d='M100 10V190M10 100H190'/></g><path d='M100 100V10' stroke='var(--lime)' stroke-width='2' style='transform-origin:100px 100px;animation:sw 4s linear infinite'/><circle id='wb' cx='160' cy='40' r='6' fill='var(--lime)'/></svg><div class='kr'><span><b>MV Karachi Star</b></span><span>ETA <b id='eta'>40</b> min</span><span>Berth <b>B-3</b></span><span>Tugs <b>2</b></span></div>`,
`<div class='wh'><span>Shuttle route</span><em>live</em></div><svg viewBox='0 0 300 80' style='width:100%' aria-hidden='true'><path d='M20 40H280' stroke='currentColor' opacity='.3' stroke-width='4' stroke-dasharray='10 8'/><circle cx='20' cy='40' r='7' fill='currentColor'/><circle cx='280' cy='40' r='7' fill='var(--lime)'/><circle id='td' cx='20' cy='40' r='9' fill='var(--lime)'/><text x='14' y='70' font-size='11' fill='currentColor' opacity='.6'>Seaport</text><text x='252' y='70' font-size='11' fill='currentColor' opacity='.6'>Dry port</text></svg><div class='kr'><span>Rail and truck <b>38 km</b></span><span>Trucks <b>6</b></span><span>ETA <b>55 min</b></span></div>`,
`<div class='wh'><span>Gate 2</span><em>live</em></div><ul><li><span>Barrier</span><b id='bs'>Closed</b></li><li><span>Truck</span><b>T-88, GMT-0042</b></li><li><span>Driver check</span><b>Verified</b></li><li><span>Queue</span><b>6 in, 5 min wait</b></li></ul>`,
`<div class='wh'><span>Customs desk</span><em id='cs'>Hold</em></div><ul class='ck'><li id='k0'><span>Bill of lading</span></li><li id='k1'><span>Commercial invoice</span></li><li id='k2'><span>Packing list</span></li><li id='k3'><span>Duty paid</span></li></ul>`,
`<div class='wh'><span>Yard stack, bay 3</span><em>live</em></div><div class='col'><i style='height:90%'></i><i style='height:70%'></i><i style='height:55%' class='g'></i><i style='height:40%'></i><i style='height:80%'></i><i style='height:60%'></i></div><p class='kr' style='margin:12px 0'>GMT-0042 sits under three blockers.</p><div class='kr'><span>Extra moves</span><span class='big2' id='xm'>0</span></div>`,
`<div class='wh'><span>Slot optimizer</span><em>scoring</em></div><div class='sb'><span>Bay 3, T1</span><div><i id='s0'></i></div>0.31</div><div class='sb'><span>Bay 5, T2</span><div><i id='s1'></i></div>0.58</div><div class='sb b'><span>Bay 7, T2</span><div><i id='s2'></i></div>0.97</div><p class='kr' style='margin-top:12px'>Best slot <b>Bay 7, tier 2</b> and extra moves <b>0</b></p>`,
`<div class='wh'><span>Crane lane</span><em>clear</em></div><svg viewBox='0 0 284 172' style='width:100%' aria-hidden='true'>${gs()}<path id='ap2' pathLength='1' d='M16 16H268V156' fill='none' stroke='var(--lime)' stroke-width='5' stroke-linecap='round' stroke-linejoin='round' stroke-dasharray='1' stroke-dashoffset='1'/></svg>`,
`<div class='wh'><span>Pickup queue</span><em>priority</em></div><ul id='qq'><li><span>GMT-0042, T-88</span><b>P1</b></li><li><span>GMT-0017, T-31</span><b>P2</b></li><li><span>GMT-0031, T-12</span><b>P3</b></li><li><span>GMT-0009, T-77</span><b>P4</b></li><li><span>GMT-0021, T-05</span><b>P5</b></li></ul>`,
`<div class='wh'><span>Invoice INV-0042</span><em>billing</em></div><ul><li><span>Free days</span><b>5</b></li><li><span>Storage</span><b>$0</b></li><li><span>Handling</span><b>$120</b></li><li><span>Total</span><b>$120</b></li></ul><p><span class='stamp' id='st' style='opacity:0'>PAID</span></p>`,
`<div class='wh'><span>Released</span><em>done</em></div><div class='kr'><span><b class='big2'>68%</b><br>fewer extra moves</span><span><b class='big2'>0</b><br>extra moves</span><span><b class='big2'>5</b><br>days dwell</span></div>`];

