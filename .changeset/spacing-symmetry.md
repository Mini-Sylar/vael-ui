---
'vael-ui': patch
---

Fixes inconsistent internal spacing in Dialog, Card, Tour, and confirmAction's popover surface, where the gap on one side of a header/body/footer-style transition was silently double-counted against the other, making the two sides unequal (e.g. Dialog's body→footer gap was exactly double its header→body gap). Also fixes Tour rendering with doubled outer padding — its own header/actions padding was stacking on top of Popover's shared body padding.
