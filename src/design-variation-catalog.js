'use strict';

function pickText(value, locale) {
  if (!value || typeof value !== 'object') return String(value || '');
  if (locale === 'pt-BR' && value['pt-BR']) return value['pt-BR'];
  return value.en || Object.values(value)[0] || '';
}

const DESIGN_VARIATION_GROUPS = [
  {
    id: 'style_modes',
    title: {
      en: 'Style modes',
      'pt-BR': 'Modos de estilo'
    },
    guidance: {
      en: 'Choose 1-3 overall visual attitudes.',
      'pt-BR': 'Escolha de 1 a 3 atitudes visuais gerais.'
    },
    options: [
      {
        id: 'classic-editorial',
        label: { en: 'Classic editorial', 'pt-BR': 'Clássico editorial' },
        description: {
          en: 'Measured hierarchy, serif authority, quieter luxury.',
          'pt-BR': 'Hierarquia medida, autoridade com serifa, luxo mais contido.'
        }
      },
      {
        id: 'extravagant-maximalist',
        label: { en: 'Extravagant / maximalist', 'pt-BR': 'Extravagante / maximalista' },
        description: {
          en: 'Dense layers, bold color, deliberate visual abundance.',
          'pt-BR': 'Camadas densas, cor forte, abundância visual deliberada.'
        }
      },
      {
        id: 'cinematic-immersive',
        label: { en: 'Cinematic / immersive', 'pt-BR': 'Cinematográfico / imersivo' },
        description: {
          en: 'Atmospheric storytelling, dramatic contrast, scene-based sections.',
          'pt-BR': 'Narrativa atmosférica, contraste dramático, seções como cenas.'
        }
      },
      {
        id: 'playful-dopamine',
        label: { en: 'Playful / dopamine', 'pt-BR': 'Lúdico / dopamina' },
        description: {
          en: 'Vibrant palettes, optimistic energy, expressive details.',
          'pt-BR': 'Paletas vibrantes, energia otimista, detalhes expressivos.'
        }
      },
      {
        id: 'neo-brutalist',
        label: { en: 'Neo-brutalist / anti-design', 'pt-BR': 'Neo-brutalista / anti-design' },
        description: {
          en: 'Hard edges, visible structure, refusal of polished sameness.',
          'pt-BR': 'Arestas duras, estrutura visível, rejeição da polidez genérica.'
        }
      },
      {
        id: 'retrofuturist',
        label: { en: 'Retrofuturist', 'pt-BR': 'Retrofuturista' },
        description: {
          en: 'Chrome, sci-fi nostalgia, arcade optimism, future-through-past mood.',
          'pt-BR': 'Cromado, nostalgia sci-fi, otimismo arcade, futuro visto pelo passado.'
        }
      },
      {
        id: 'luxury-modern',
        label: { en: 'Luxury modern', 'pt-BR': 'Luxo moderno' },
        description: {
          en: 'High restraint, premium spacing, selective ornament, strong finish.',
          'pt-BR': 'Alto refinamento, respiro premium, ornamento seletivo, acabamento forte.'
        }
      },
      {
        id: 'collage-handmade',
        label: { en: 'Collage / handmade', 'pt-BR': 'Colagem / artesanal' },
        description: {
          en: 'Cutout rhythm, mixed media, imperfect but intentional craft.',
          'pt-BR': 'Ritmo de recorte, mixed media, imperfeição intencional.'
        }
      }
    ]
  },
  {
    id: 'layout_moves',
    title: { en: 'Layout moves', 'pt-BR': 'Movimentos de layout' },
    guidance: {
      en: 'Choose 1-3 layout signatures.',
      'pt-BR': 'Escolha de 1 a 3 assinaturas de layout.'
    },
    options: [
      {
        id: 'asymmetric-composition',
        label: { en: 'Asymmetric composition', 'pt-BR': 'Composição assimétrica' },
        description: {
          en: 'Uneven weight, offset blocks, tension instead of centered sameness.',
          'pt-BR': 'Peso desigual, blocos deslocados, tensão no lugar da simetria genérica.'
        }
      },
      {
        id: 'narrative-scroll',
        label: { en: 'Narrative scroll scenes', 'pt-BR': 'Scroll narrativo em cenas' },
        description: {
          en: 'Sections behave like chapters rather than stacked cards.',
          'pt-BR': 'As seções se comportam como capítulos, não como pilhas de cards.'
        }
      },
      {
        id: 'experimental-navigation',
        label: { en: 'Experimental navigation', 'pt-BR': 'Navegação experimental' },
        description: {
          en: 'Hidden drawers, radial ideas, map-like exploration, non-standard entry points.',
          'pt-BR': 'Gavetas ocultas, ideias radiais, exploração em mapa, entradas não convencionais.'
        }
      },
      {
        id: 'dense-mosaic',
        label: { en: 'Dense mosaic', 'pt-BR': 'Mosaico denso' },
        description: {
          en: 'Many surfaces, varied card sizes, information collage.',
          'pt-BR': 'Muitas superfícies, tamanhos variados de cards, colagem de informação.'
        }
      },
      {
        id: 'split-screen',
        label: { en: 'Split-screen contrast', 'pt-BR': 'Contraste em tela dividida' },
        description: {
          en: 'Persistent tension between two visual zones.',
          'pt-BR': 'Tensão persistente entre duas zonas visuais.'
        }
      },
      {
        id: 'hero-signature',
        label: { en: 'Signature hero structure', 'pt-BR': 'Hero com assinatura estrutural' },
        description: {
          en: 'Unmistakable opening composition that defines the whole system.',
          'pt-BR': 'Composição de abertura marcante que define o sistema inteiro.'
        }
      }
    ]
  },
  {
    id: 'motion_system',
    title: { en: 'Motion system', 'pt-BR': 'Sistema de motion' },
    guidance: {
      en: 'Choose 0-3 motion directions.',
      'pt-BR': 'Escolha de 0 a 3 direções de motion.'
    },
    options: [
      {
        id: 'restrained-microinteractions',
        label: { en: 'Restrained microinteractions', 'pt-BR': 'Microinterações contidas' },
        description: {
          en: 'Tight, functional feedback without spectacle.',
          'pt-BR': 'Feedback preciso e funcional, sem espetáculo gratuito.'
        }
      },
      {
        id: 'kinetic-typography',
        label: { en: 'Kinetic typography', 'pt-BR': 'Tipografia cinética' },
        description: {
          en: 'Animated type as a primary storytelling layer.',
          'pt-BR': 'Tipografia animada como camada principal de narrativa.'
        }
      },
      {
        id: 'scroll-driven-scenes',
        label: { en: 'Scroll-driven scenes', 'pt-BR': 'Cenas guiadas por scroll' },
        description: {
          en: 'Sections animate from scroll progress instead of generic reveal-once effects.',
          'pt-BR': 'Seções animam pelo progresso do scroll, não por reveals genéricos.'
        }
      },
      {
        id: 'view-transitions',
        label: { en: 'View transitions', 'pt-BR': 'Transições entre views' },
        description: {
          en: 'Navigation carries continuity across screens and states.',
          'pt-BR': 'A navegação carrega continuidade entre telas e estados.'
        }
      },
      {
        id: 'cursor-reactive',
        label: { en: 'Cursor-reactive motion', 'pt-BR': 'Motion reativo ao cursor' },
        description: {
          en: 'Pointer proximity, hover depth, reactive highlights.',
          'pt-BR': 'Proximidade do ponteiro, profundidade no hover, highlights reativos.'
        }
      },
      {
        id: 'gamified-feedback',
        label: { en: 'Gamified feedback', 'pt-BR': 'Feedback gamificado' },
        description: {
          en: 'Playful state changes, reward loops, delight moments.',
          'pt-BR': 'Mudanças de estado lúdicas, loops de recompensa, momentos de delight.'
        }
      }
    ]
  },
  {
    id: 'materials_textures',
    title: { en: 'Materials and textures', 'pt-BR': 'Materiais e texturas' },
    guidance: {
      en: 'Choose 0-3 surface languages.',
      'pt-BR': 'Escolha de 0 a 3 linguagens de superfície.'
    },
    options: [
      {
        id: 'glass-layers',
        label: { en: 'Glass layers', 'pt-BR': 'Camadas de vidro' },
        description: {
          en: 'Blur, translucency, luminous edges, depth through substrate.',
          'pt-BR': 'Blur, translucidez, bordas luminosas, profundidade via substrato.'
        }
      },
      {
        id: 'grain-noise',
        label: { en: 'Grain / noise', 'pt-BR': 'Grão / ruído' },
        description: {
          en: 'Controlled texture to break digital smoothness.',
          'pt-BR': 'Textura controlada para quebrar a suavidade digital.'
        }
      },
      {
        id: 'paper-editorial',
        label: { en: 'Paper / editorial tactility', 'pt-BR': 'Papel / tato editorial' },
        description: {
          en: 'Warm surfaces, print-like rhythm, subtle shadow and fiber cues.',
          'pt-BR': 'Superfícies quentes, ritmo de impresso, sombras e fibras sutis.'
        }
      },
      {
        id: 'chrome-metallic',
        label: { en: 'Chrome / metallic', 'pt-BR': 'Chrome / metálico' },
        description: {
          en: 'Specular highlights, future-luxury finish, reflective details.',
          'pt-BR': 'Highlights especulares, acabamento de luxo futurista, reflexos.'
        }
      },
      {
        id: 'soft-neumorphic',
        label: { en: 'Soft neumorphic tactility', 'pt-BR': 'Tatilidade neumórfica suave' },
        description: {
          en: 'Raised/inset touchable controls used with restraint.',
          'pt-BR': 'Controles elevados/escavados com sensação tátil usados com moderação.'
        }
      },
      {
        id: 'collage-cutout',
        label: { en: 'Collage / cutout', 'pt-BR': 'Colagem / recorte' },
        description: {
          en: 'Layered fragments, taped edges, mixed media feeling.',
          'pt-BR': 'Fragmentos em camadas, bordas coladas, sensação de mixed media.'
        }
      }
    ]
  },
  {
    id: 'typography_moves',
    title: { en: 'Typography moves', 'pt-BR': 'Movimentos tipográficos' },
    guidance: {
      en: 'Choose 1-3 type directions.',
      'pt-BR': 'Escolha de 1 a 3 direções tipográficas.'
    },
    options: [
      {
        id: 'bold-display',
        label: { en: 'Bold display type', 'pt-BR': 'Display tipográfico forte' },
        description: {
          en: 'Oversized headlines with strong personality.',
          'pt-BR': 'Títulos grandes com personalidade forte.'
        }
      },
      {
        id: 'variable-font-axes',
        label: { en: 'Variable font axes', 'pt-BR': 'Eixos de fonte variável' },
        description: {
          en: 'Weight/width/optical-size variation used as design material.',
          'pt-BR': 'Variação de peso/largura/tamanho óptico usada como material de design.'
        }
      },
      {
        id: 'serif-revival',
        label: { en: 'Serif revival', 'pt-BR': 'Retorno das serifas' },
        description: {
          en: 'Warmth, authority, or cultural depth against digital fatigue.',
          'pt-BR': 'Calor, autoridade ou profundidade cultural contra a fadiga digital.'
        }
      },
      {
        id: 'mono-rails',
        label: { en: 'Mono rails', 'pt-BR': 'Trilhos mono' },
        description: {
          en: 'Technical labels and metadata rhythm as a structural device.',
          'pt-BR': 'Labels técnicos e ritmo de metadata como dispositivo estrutural.'
        }
      },
      {
        id: 'compressed-headlines',
        label: { en: 'Compressed headlines', 'pt-BR': 'Headlines comprimidos' },
        description: {
          en: 'Tall or condensed drama for cinematic or editorial systems.',
          'pt-BR': 'Drama alto ou condensado para sistemas cinematográficos ou editoriais.'
        }
      },
      {
        id: 'mixed-type-system',
        label: { en: 'Mixed type system', 'pt-BR': 'Sistema tipográfico misto' },
        description: {
          en: 'Two or more families with clear role separation.',
          'pt-BR': 'Duas ou mais famílias com papéis bem separados.'
        }
      }
    ]
  },
  {
    id: 'advanced_css',
    title: { en: 'Advanced CSS', 'pt-BR': 'CSS avançado' },
    guidance: {
      en: 'Choose 0-4 implementation techniques.',
      'pt-BR': 'Escolha de 0 a 4 técnicas de implementação.'
    },
    options: [
      {
        id: 'scroll-driven-animations',
        label: { en: 'Scroll-driven animations', 'pt-BR': 'Animações guiadas por scroll' },
        description: {
          en: 'Use CSS scroll/view timelines for scene logic.',
          'pt-BR': 'Use timelines de scroll/view em CSS para lógica de cenas.'
        }
      },
      {
        id: 'view-transition-api',
        label: { en: 'View Transition API', 'pt-BR': 'View Transition API' },
        description: {
          en: 'Carry continuity between routes or UI states.',
          'pt-BR': 'Carrega continuidade entre rotas ou estados da UI.'
        }
      },
      {
        id: 'mask-clip-path',
        label: { en: 'Masks / clip-path', 'pt-BR': 'Masks / clip-path' },
        description: {
          en: 'Non-rectangular reveals, image windows, ornamental cuts.',
          'pt-BR': 'Revelações não retangulares, janelas de imagem, cortes ornamentais.'
        }
      },
      {
        id: 'svg-filters-noise',
        label: { en: 'SVG filters / noise', 'pt-BR': 'SVG filters / ruído' },
        description: {
          en: 'Distortion, grain, displacement, tactile imperfection.',
          'pt-BR': 'Distorção, grão, displacement, imperfeição tátil.'
        }
      },
      {
        id: 'backdrop-filter',
        label: { en: 'Backdrop filters', 'pt-BR': 'Backdrop filters' },
        description: {
          en: 'Glass depth and layered translucency.',
          'pt-BR': 'Profundidade de vidro e translucidez em camadas.'
        }
      },
      {
        id: '3d-transforms',
        label: { en: '3D transforms', 'pt-BR': 'Transforms 3D' },
        description: {
          en: 'Perspective cards, depth stacks, immersive hero moments.',
          'pt-BR': 'Cards em perspectiva, pilhas com profundidade, momentos de hero imersivos.'
        }
      },
      {
        id: 'sticky-storytelling',
        label: { en: 'Sticky storytelling', 'pt-BR': 'Storytelling com sticky' },
        description: {
          en: 'Pinned chapters, progressive reveals, staged narrative.',
          'pt-BR': 'Capítulos fixados, revelações progressivas, narrativa encenada.'
        }
      }
    ]
  },
  {
    id: 'anti_sameness',
    title: { en: 'Anti-sameness guardrails', 'pt-BR': 'Guardrails anti-mesmice' },
    guidance: {
      en: 'Choose 2-4 traits that must be visible in the final result.',
      'pt-BR': 'Escolha de 2 a 4 traços que devem aparecer no resultado final.'
    },
    options: [
      {
        id: 'avoid-generic-hero',
        label: { en: 'No generic hero', 'pt-BR': 'Sem hero genérico' },
        description: {
          en: 'The opening section must have a distinctive structural move.',
          'pt-BR': 'A seção de abertura precisa ter um movimento estrutural distintivo.'
        }
      },
      {
        id: 'uneven-rhythm',
        label: { en: 'Uneven rhythm on purpose', 'pt-BR': 'Ritmo desigual de propósito' },
        description: {
          en: 'Break repetitive card-grid monotony with controlled variation.',
          'pt-BR': 'Quebre a monotonia da grade repetitiva com variação controlada.'
        }
      },
      {
        id: 'domain-specific-ornament',
        label: { en: 'Domain-specific ornament', 'pt-BR': 'Ornamento específico de domínio' },
        description: {
          en: 'Visual language should come from the product domain, not default SaaS clichés.',
          'pt-BR': 'A linguagem visual deve vir do domínio do produto, não do clichê SaaS.'
        }
      },
      {
        id: 'signature-surface',
        label: { en: 'Signature surface treatment', 'pt-BR': 'Tratamento de superfície assinatura' },
        description: {
          en: 'At least one surface treatment should be unmistakable.',
          'pt-BR': 'Pelo menos um tratamento de superfície deve ser inconfundível.'
        }
      },
      {
        id: 'color-courage',
        label: { en: 'Color courage', 'pt-BR': 'Corajoso nas cores' },
        description: {
          en: 'Permit stronger contrast or richer palette when it serves identity.',
          'pt-BR': 'Permita contraste mais forte ou paleta mais rica quando servir à identidade.'
        }
      },
      {
        id: 'motion-with-purpose',
        label: { en: 'Motion with purpose', 'pt-BR': 'Motion com propósito' },
        description: {
          en: 'Motion must communicate hierarchy or feel, not act as filler.',
          'pt-BR': 'Motion precisa comunicar hierarquia ou sensação, não preencher espaço.'
        }
      }
    ]
  }
];

const DESIGN_VARIATION_SOURCES = [
  {
    label: {
      en: 'Figma: Top Web Design Trends for 2026',
      'pt-BR': 'Figma: tendências de web design para 2026'
    },
    url: 'https://www.figma.com/resource-library/web-design-trends/'
  },
  {
    label: {
      en: 'Webflow: Variable fonts',
      'pt-BR': 'Webflow: variable fonts'
    },
    url: 'https://help.webflow.com/hc/en-us/articles/33961307448979-Variable-fonts'
  },
  {
    label: {
      en: 'web.dev: Same-document view transitions Baseline (Oct 16, 2025)',
      'pt-BR': 'web.dev: same-document view transitions em Baseline (16 out 2025)'
    },
    url: 'https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available'
  },
  {
    label: {
      en: 'web.dev: Interop 2026 and scroll-driven animations',
      'pt-BR': 'web.dev: Interop 2026 e animações guiadas por scroll'
    },
    url: 'https://web.dev/blog/interop-2026?hl=en'
  }
];

function localizeOption(option, locale) {
  return {
    id: option.id,
    label: pickText(option.label, locale),
    description: pickText(option.description, locale)
  };
}

function getDesignVariationCatalog(locale = 'en') {
  return DESIGN_VARIATION_GROUPS.map((group) => ({
    id: group.id,
    title: pickText(group.title, locale),
    guidance: pickText(group.guidance, locale),
    options: group.options.map((option) => localizeOption(option, locale))
  }));
}

function getDesignVariationSources(locale = 'en') {
  return DESIGN_VARIATION_SOURCES.map((source) => ({
    label: pickText(source.label, locale),
    url: source.url
  }));
}

module.exports = {
  getDesignVariationCatalog,
  getDesignVariationSources
};
