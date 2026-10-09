export type StoredRecord={id:string;kind:string;data:string;owner:string|null;visibility:string;parent:string|null;updated?:string};
export function canRead(record:StoredRecord,userId:string|null,byId:Map<string,StoredRecord>,seen=new Set<string>()):boolean{
 if(seen.has(record.id))return false;
 seen.add(record.id);
 if(record.visibility!=='shared'&&(!userId||record.owner!==userId))return false;
 if(record.parent){const parent=byId.get(record.parent);if(!parent||!canRead(parent,userId,byId,seen))return false;}
 return true;
}
export function canEdit(record:StoredRecord,userId:string|null):boolean{return !!userId&&record.owner===userId;}
