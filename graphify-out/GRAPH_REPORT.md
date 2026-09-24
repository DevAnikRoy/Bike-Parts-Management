# Graph Report - Bike-Parts-Management  (2026-09-24)

## Corpus Check
- Corpus is ~30,969 words - fits in a single context window. You may not need a graph.

## Summary
- 436 nodes · 960 edges · 37 communities (15 shown, 22 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 36

## God Nodes (most connected - your core abstractions)
1. `useData()` - 29 edges
2. `loadCloudDb()` - 21 edges
3. `compilerOptions` - 18 edges
4. `react` - 17 edges
5. `useAuth()` - 17 edges
6. `formatTk()` - 16 edges
7. `react-router-dom` - 15 edges
8. `compilerOptions` - 15 edges
9. `main()` - 13 edges
10. `num()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `ensurePart()` --calls--> `catalogPayload()`  [EXTRACTED]
  scripts/live-isolation-anon.mts → src/lib/catalog.ts
- `ensurePart()` --calls--> `catalogPayload()`  [EXTRACTED]
  scripts/live-isolation-password.mts → src/lib/catalog.ts
- `ensurePart()` --calls--> `catalogPayload()`  [EXTRACTED]
  scripts/live-isolation-smoke.mts → src/lib/catalog.ts
- `RequireAuth()` --calls--> `isDatabaseSetupError()`  [EXTRACTED]
  src/App.tsx → src/lib/errors.ts
- `SetupWizard()` --calls--> `useData()`  [EXTRACTED]
  src/components/SetupWizard.tsx → src/lib/data.tsx

## Import Cycles
- None detected.

## Communities (37 total, 22 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (34): react, react-router-dom, RequireAuth(), Layout(), MAIN, MORE, PageHeader(), Props (+26 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (47): bajajCommuter, bajajSport, compatibility, hero125, hero150, heroCommuter, PartDef, parts (+39 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (37): dependencies, react, react-dom, react-router-dom, @supabase/supabase-js, uuid, devDependencies, oxlint (+29 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (35): ref_node_child_process, ref_node_fs, ref_node_path, ref_node_url, fails, mustMentionShop, root, shopTables (+27 more)

### Community 4 - "Community 4"
Cohesion: 0.16
Nodes (33): client(), cloudAddCustomer(), cloudAddSupplier(), cloudCompleteSale(), cloudProcessReturn(), cloudReceivePurchase(), cloudUpdateShop(), fail() (+25 more)

### Community 5 - "Community 5"
Cohesion: 0.15
Nodes (24): bike_models, brands, customers, movements_part_idx, part_categories, part_model_compatibility, parts, parts_oem_idx (+16 more)

### Community 6 - "Community 6"
Cohesion: 0.10
Nodes (18): react-dom, App(), CloudSetup(), ErrorBoundary, Props, State, src_index, AuthContext (+10 more)

### Community 7 - "Community 7"
Cohesion: 0.23
Nodes (23): bike_models, brands, customers, movements_part_idx, part_categories, part_model_compatibility, parts, parts_oem_idx (+15 more)

### Community 8 - "Community 8"
Cohesion: 0.18
Nodes (15): Point, SalesLineChart(), TopPartsBarChart(), SetupWizard(), dayKey(), isFreshShop(), lowStockRows(), monthSalesTotal() (+7 more)

### Community 9 - "Community 9"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 11 - "Community 11"
Cohesion: 0.21
Nodes (14): @supabase/supabase-js, bootShop(), clientWithSession(), ensurePart(), loadAnonFromLive(), main(), readShopId(), bootShop() (+6 more)

### Community 12 - "Community 12"
Cohesion: 0.33
Nodes (5): public.process_return_serial(), public.receive_purchase(), shops, stock_balances, stock_units

### Community 13 - "Community 13"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 14 - "Community 14"
Cohesion: 0.40
Nodes (5): public.ensure_my_shop(), public.process_return_qty(), public.seed_catalog(), parts, profiles

## Knowledge Gaps
- **109 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `name` (+104 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 171 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@supabase/supabase-js` connect `Community 11` to `Community 2`, `Community 3`, `Community 4`, `Community 6`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._
- **Why does `react` connect `Community 0` to `Community 1`, `Community 2`, `Community 6`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `react-router-dom` connect `Community 0` to `Community 8`, `Community 2`, `Community 6`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Are the 15 inferred relationships involving `loadCloudDb()` (e.g. with `mapBalance()` and `mapBrand()`) actually correct?**
  _`loadCloudDb()` has 15 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _109 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08990384615384615 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07272727272727272 - nodes in this community are weakly interconnected._