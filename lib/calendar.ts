type Event={[key:string]:any};
export function inMainCalendar(e:Event){return e.calendarScope!=='personal'||e.calendarPublication==='all'}
export function calendarDayStyle(events:Event[]){const fill=events.find(e=>e.fillDay);return fill?{backgroundColor:fill.dayFillColor||(fill.eventColor||'#8062ce')+'55'}:undefined}
