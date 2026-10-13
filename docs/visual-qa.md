# Visual QA

Reference: [reader concept](../src/assets/design/reader-concept.png). Final browser captures: [desktop at 1586 × 992](reader-desktop.jpg), [mobile reader at 390 × 844](reader-mobile.jpg), and [mobile inspector at 390 × 844](inspector-mobile.jpg). The app was checked in the Codex in-app browser; both reference and final desktop capture were inspected with `view_image` at the concept's native dimensions.

| Comparison point | Concept and browser evidence | Result |
| --- | --- | --- |
| Header | Serif brand, Library/Read/Review navigation, compact progress at top | Same hierarchy and green active underline. The archived capture reads `0 / 8 stories`; it predates two later story additions. |
| Reader layout | Story rail, large reading pane, inspector over tutor | Same three-column structure and separate scrolling surfaces at native size. |
| Typography and spacing | Large serif story title and reading text; smaller sans-serif metadata and controls | Same type roles and spacious paragraph rhythm; real story length extends below the viewport and scrolls. |
| Inspector | Selected `kávu`, meaning, base form, forms, speaker, save action | All are visible with the real reviewed glossary entry. Labels use `Base form`, `Type`, and `Forms` from the implemented data model. |
| Tutor and actions | Tutor beneath inspector; clear route to voice and comprehension questions | Text/Voice tabs and a voice start action are visible. The tutor starts with an empty state instead of the concept's fictional conversation. Quiz CTA appears at the end of the scrollable story. |
| Mobile | Story remains primary and inspector stays usable | 390 px checks show readable text and Story/Inspector/Tutor tabs, without horizontal overflow. |

Above-the-fold copy differs only where the concept used illustrative content: its ten-story counter, story titles and text, and sample chat were replaced with the then-current eight original stories and a truthful empty chat state. There are no remaining material visual mismatches in the checked states. The implementation was verified against the concept at its native desktop size and in the mobile browser.
