/**
 * One piece of work every framework is asked to do, so each suite compares like with like.
 */
export interface Scenario {
  /**
   * The name the results are reported under.
   */
  name: string;

  /**
   * How many pass-through middleware run before the one that responds.
   */
  chain: number;

  /**
   * Whether the response is the JSON payload rather than plain text.
   */
  json: boolean;
}

export const scenarios: Scenario[] = [
  { name: "single middleware", chain: 0, json: false },
  { name: "10 middleware chain", chain: 10, json: false },
  { name: "50 middleware chain", chain: 50, json: false },
  { name: "100 middleware chain", chain: 100, json: false },
  { name: "200 middleware chain", chain: 200, json: false },
  { name: "JSON response", chain: 0, json: true },
];

export const data = { items: new Array(100).fill({ id: 1, name: "test" }) };
