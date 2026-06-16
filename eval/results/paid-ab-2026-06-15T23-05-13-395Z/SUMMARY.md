# Paid enricher model A/B - 2026-06-15T23-05-13-395Z

Total actual cost: $1.815766

| Candidate | Completed | Failed | Avg score | Medical failures | Input tokens | Output tokens | Cost | Avg latency |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| haiku-4.5 | 30 | 0 | 0.697 | 38 | 291894 | 298494 | $1.784364 | 70763 ms |
| nova-lite | 30 | 0 | 0.634 | 43 | 251977 | 67861 | $0.031402 | 15266 ms |

Verdict: No candidate fully cleared deterministic medical gate; do not migrate yet.

Medical gate failures:
- haiku-4.5 / ashwagandha-test-1767124305: dosage_numeric_drift:1,1.2,2,3,6,15,30,50,100,125,200
- haiku-4.5 / ashwagandha-test-1767124305: missing_safety_interactions
- haiku-4.5 / berberina: dosage_numeric_drift:30,50
- haiku-4.5 / berberina: missing_safety_interactions
- haiku-4.5 / Berberine: dosage_numeric_drift:1,1.5,2,250,300
- haiku-4.5 / Berberine: missing_safety_interactions
- haiku-4.5 / black seed: dosage_numeric_drift:1,2,4
- haiku-4.5 / black seed: missing_safety_interactions
- haiku-4.5 / black seed oil: dosage_numeric_drift:150,225,300
- haiku-4.5 / cardo mariano: dosage_numeric_drift:70
- haiku-4.5 / cardo mariano: missing_safety_interactions
- haiku-4.5 / coenzyme q10: dosage_numeric_drift:300,1200
- haiku-4.5 / coenzyme q10: missing_safety_interactions
- haiku-4.5 / colágen: dosage_numeric_drift:1500
- haiku-4.5 / CoQ10: dosage_numeric_drift:0.8,1.5,3000
- haiku-4.5 / CoQ10: missing_safety_interactions
- haiku-4.5 / Creatina: missing_safety_interactions
- haiku-4.5 / Creatine: missing_safety_interactions
- haiku-4.5 / curcumin: dosage_numeric_drift:5,20,300,2000,4000
- haiku-4.5 / curcumin: missing_safety_interactions
- haiku-4.5 / fish oil: dosage_numeric_drift:1,1.5,2,2.5,3,4,5,200,300,400,500,600
- haiku-4.5 / folic acid: dosage_numeric_drift:2000,5000
- haiku-4.5 / garcinia cambogia: missing_safety_interactions
- haiku-4.5 / ginger: dosage_numeric_drift:1,2,3,4,5,10,20,3000,4000
- haiku-4.5 / ginger: missing_safety_interactions
- haiku-4.5 / hericium erinaceus: dosage_numeric_drift:1,2,3,5
- haiku-4.5 / hericium erinaceus: missing_safety_interactions
- haiku-4.5 / hierbabuena: dosage_numeric_drift:600
- haiku-4.5 / hierbabuena: missing_safety_interactions
- haiku-4.5 / lions mane: dosage_numeric_drift:2000,5000
- haiku-4.5 / magnesio: dosage_numeric_drift:1200
- haiku-4.5 / magnesium: dosage_numeric_drift:1200
- haiku-4.5 / Omega-3: dosage_numeric_drift:1,2,3,4,5,10,12,15,150,500,5000
- haiku-4.5 / omega 3 epa: unsupported_pmids:16585764,18199473,21677272,29046396,9884124
- haiku-4.5 / omega 3 epa: dosage_numeric_drift:1,2,3,4,5,17,500
- haiku-4.5 / omega 3 epa: missing_safety_interactions
- haiku-4.5 / proteína whey: dosage_numeric_drift:150,200
- haiku-4.5 / sábila: dosage_numeric_drift:1000
- nova-lite / aceite de comino negro: unsupported_pmids:23456789,34567890
- nova-lite / aloe barbadensis: unsupported_pmids:12345678,87654321
- nova-lite / ashwagandha-test-1767124305: unsupported_pmids:32123456,76543210
- nova-lite / berberina: unsupported_pmids:12345678,87654321
- nova-lite / Berberine: unsupported_pmids:12345678,87654321
- nova-lite / black seed: unsupported_pmids:23456789
- nova-lite / black seed: dosage_numeric_drift:300
- nova-lite / black seed oil: unsupported_pmids:23456789,34567890
- nova-lite / cardo mariano: unsupported_pmids:12345678
- nova-lite / coenzyme q10: unsupported_pmids:12345678
- nova-lite / coenzyme q10: dosage_numeric_drift:300,1200
- nova-lite / colágen: unsupported_pmids:23456789,34567890
- nova-lite / colágen: missing_safety_interactions
- nova-lite / collagen: unsupported_pmids:23456789,34567890
- nova-lite / CoQ10: unsupported_pmids:12345678,87654321
- nova-lite / CoQ10: dosage_numeric_drift:1200
- nova-lite / Creatina: unsupported_pmids:12345678,87654321
- nova-lite / Creatina: dosage_numeric_drift:300
- nova-lite / Creatine: unsupported_pmids:12345678,87654321
- nova-lite / Creatine: dosage_numeric_drift:300
- nova-lite / curcumin: unsupported_pmids:23456789,34567890
- nova-lite / curcumin: dosage_numeric_drift:2000
- nova-lite / fish oil: unsupported_pmids:12345678,87654321
- nova-lite / fish oil: dosage_numeric_drift:1,2,4,6
- nova-lite / folic acid: unsupported_pmids:12345678
- nova-lite / garcinia cambogia: unsupported_pmids:12345678,87654321
- nova-lite / ginger: unsupported_pmids:12345678,98765432
- nova-lite / ginger: dosage_numeric_drift:1,1.5,2,4
- nova-lite / hericium erinaceus: unsupported_pmids:23456789,34567890
- nova-lite / hericium erinaceus: dosage_numeric_drift:1,2,3
- nova-lite / hierbabuena: unsupported_pmids:12345678
- nova-lite / hierbabuena: dosage_numeric_drift:300,600,1200
- nova-lite / lions mane: unsupported_pmids:23456789
- nova-lite / lions mane: dosage_numeric_drift:300,2000
- nova-lite / magnesio: unsupported_pmids:12345678
- nova-lite / magnesium: unsupported_pmids:12345678,87654321
- nova-lite / mumijo: unsupported_pmids:23456789,34567890
- nova-lite / Omega-3: unsupported_pmids:12345678,87654321
- nova-lite / Omega-3: dosage_numeric_drift:500,5000
- nova-lite / omega 3 epa: unsupported_pmids:12345678
- nova-lite / omega 3 epa: dosage_numeric_drift:4000
- nova-lite / probiotics: unsupported_pmids:23456789
- nova-lite / proteína whey: unsupported_pmids:23456789
