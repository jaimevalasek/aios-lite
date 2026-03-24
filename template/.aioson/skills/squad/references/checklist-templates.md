---
name: checklist-templates
description: Quality checklist templates organized by domain and output type
version: 1.0.0
---

# Checklist Templates

Reusable quality checklists for squad outputs. These can be referenced in
manifest checklists or used as veto condition sources.

## General content checklist

```markdown
## Content Quality Checklist
- [ ] Clear and compelling headline/title
- [ ] Hook in the first paragraph/sentence
- [ ] Logical flow from introduction to conclusion
- [ ] No grammatical or spelling errors
- [ ] Sources cited for factual claims
- [ ] Call-to-action present and appropriate
- [ ] Formatted for the target platform
- [ ] Brand voice consistent throughout
```

## Social media checklist

```markdown
## Social Media Quality Checklist
- [ ] Platform character/duration limits respected
- [ ] Hook in first line (text) or first 3 seconds (video)
- [ ] Hashtags relevant and platform-appropriate
- [ ] CTA matches platform behavior (follow, like, comment, share)
- [ ] Visual/thumbnail meets platform specs (dimensions, file size)
- [ ] No banned words or flagged content
- [ ] Posting time aligns with audience activity
- [ ] Cross-platform consistency verified (if multi-platform)
```

## Video script checklist

```markdown
## Video Script Quality Checklist
- [ ] Hook captures attention in first 3 seconds
- [ ] Context bridge explains why viewer should stay (3-15s)
- [ ] Value delivery structured in clear chapters/segments
- [ ] Retention hooks at chapter transitions
- [ ] CTA integrated naturally (not forced)
- [ ] Script length matches target duration
- [ ] Thumbnail concept included or referenced
- [ ] Title options provided (3-5 variations)
- [ ] Description and tags optimized for search
```

## Blog/article checklist

```markdown
## Blog/Article Quality Checklist
- [ ] Title is descriptive and SEO-friendly
- [ ] Meta description written (150-160 characters)
- [ ] Introduction states the value proposition
- [ ] Subheadings break content into scannable sections
- [ ] Images/media support the text
- [ ] Internal and external links included
- [ ] Conclusion summarizes key takeaways
- [ ] CTA directs reader to next step
- [ ] Reading time estimate included
```

## Software deliverable checklist

```markdown
## Software Deliverable Checklist
- [ ] Requirements fully addressed
- [ ] Code follows project conventions
- [ ] Tests written and passing
- [ ] No security vulnerabilities introduced
- [ ] Error handling covers edge cases
- [ ] Documentation updated
- [ ] Performance impact assessed
- [ ] Backward compatibility maintained (or breaking changes documented)
```

## Research/analysis checklist

```markdown
## Research Quality Checklist
- [ ] Research question clearly defined
- [ ] Sources are credible and diverse
- [ ] Data is current (within acceptable timeframe)
- [ ] Claims are supported by evidence
- [ ] Counterarguments acknowledged
- [ ] Methodology is transparent
- [ ] Conclusions follow from evidence
- [ ] Limitations explicitly stated
```

## Using checklists in manifests

Reference a checklist in the squad manifest:

```json
{
  "checklists": [
    {
      "slug": "content-quality",
      "title": "Content Quality",
      "source": "skills/squad/references/checklist-templates.md#general-content-checklist",
      "applies_to": ["scriptwriter", "copywriter"]
    }
  ]
}
```

## Creating domain-specific checklists

For domains not covered here, derive checklists from:

1. **Investigation findings** — D3 (Quality Benchmarks) from @orache
2. **Industry standards** — professional association guidelines
3. **Anti-patterns** — D2 findings become negative checks ("must NOT contain...")
4. **Platform requirements** — technical constraints from target platforms
