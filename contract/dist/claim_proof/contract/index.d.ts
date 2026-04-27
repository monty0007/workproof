import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
}

export type ImpureCircuits<PS> = {
  claim_employment(context: __compactRuntime.CircuitContext<PS>,
                   c_id_0: string,
                   u_hash_0: string,
                   co_hash_0: string,
                   c_hash_0: string,
                   timestamp_0: string,
                   employment_days_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  verify_claim(context: __compactRuntime.CircuitContext<PS>,
               c_id_0: string,
               v_hash_0: string,
               c_hash_0: string,
               v_type_0: string,
               vp_hash_0: string): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  claim_employment(context: __compactRuntime.CircuitContext<PS>,
                   c_id_0: string,
                   u_hash_0: string,
                   co_hash_0: string,
                   c_hash_0: string,
                   timestamp_0: string,
                   employment_days_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  verify_claim(context: __compactRuntime.CircuitContext<PS>,
               c_id_0: string,
               v_hash_0: string,
               c_hash_0: string,
               v_type_0: string,
               vp_hash_0: string): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  claim_employment(context: __compactRuntime.CircuitContext<PS>,
                   c_id_0: string,
                   u_hash_0: string,
                   co_hash_0: string,
                   c_hash_0: string,
                   timestamp_0: string,
                   employment_days_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  verify_claim(context: __compactRuntime.CircuitContext<PS>,
               c_id_0: string,
               v_hash_0: string,
               c_hash_0: string,
               v_type_0: string,
               vp_hash_0: string): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly claim_id: string;
  readonly user_hash: string;
  readonly company_hash: string;
  readonly claim_hash: string;
  readonly claim_timestamp: string;
  readonly claim_verified: bigint;
  readonly verifier_hash: string;
  readonly verification_type: string;
  readonly verify_proof_hash: string;
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
