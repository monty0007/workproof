import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  commit_dataset(context: __compactRuntime.CircuitContext<PS>,
                 d_id_0: string,
                 empl_hash_0: string,
                 schema_hash_0: string,
                 timestamp_0: string,
                 record_count_0: bigint,
                 min_record_count_0: bigint,
                 deidentified_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  prove_training(context: __compactRuntime.CircuitContext<PS>,
                 d_id_0: string,
                 m_hash_0: string,
                 s_hash_0: string,
                 training_rows_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  commit_dataset(context: __compactRuntime.CircuitContext<PS>,
                 d_id_0: string,
                 empl_hash_0: string,
                 schema_hash_0: string,
                 timestamp_0: string,
                 record_count_0: bigint,
                 min_record_count_0: bigint,
                 deidentified_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  prove_training(context: __compactRuntime.CircuitContext<PS>,
                 d_id_0: string,
                 m_hash_0: string,
                 s_hash_0: string,
                 training_rows_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  commit_dataset(context: __compactRuntime.CircuitContext<PS>,
                 d_id_0: string,
                 empl_hash_0: string,
                 schema_hash_0: string,
                 timestamp_0: string,
                 record_count_0: bigint,
                 min_record_count_0: bigint,
                 deidentified_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  prove_training(context: __compactRuntime.CircuitContext<PS>,
                 d_id_0: string,
                 m_hash_0: string,
                 s_hash_0: string,
                 training_rows_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly dataset_id: string;
  readonly employer_id_hash: string;
  readonly dataset_schema_hash: string;
  readonly commit_timestamp: string;
  readonly compliance_status: bigint;
  readonly dataset_available: bigint;
  readonly bytes_pii_exposed: bigint;
  readonly model_output_hash: string;
  readonly training_proven: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
