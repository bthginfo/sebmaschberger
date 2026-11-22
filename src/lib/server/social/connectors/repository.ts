import 'server-only';
import {getRecord,listRecords,mutateRecord} from '@/lib/db';
import type {ConnectorRepository,ConnectorKind,ConnectorRecordMap} from './records';

export const connectorRepository:ConnectorRepository={
 get:<K extends ConnectorKind>(kind:K,id:string)=>getRecord<ConnectorRecordMap[K]>('social-connector-'+kind,id),
 list:<K extends ConnectorKind>(kind:K)=>listRecords<ConnectorRecordMap[K]>('social-connector-'+kind),
 mutate:<K extends ConnectorKind>(kind:K,id:string,update:(previous:ConnectorRecordMap[K]|null)=>ConnectorRecordMap[K])=>mutateRecord<ConnectorRecordMap[K]|null>('social-connector-'+kind,id,null,update) as Promise<ConnectorRecordMap[K]>
};
