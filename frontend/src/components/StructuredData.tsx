import Script from 'next/script';

interface StructuredDataProps {
  type: 'SoftwareApplication' | 'Organization' | 'WebPage';
  data?: any;
}

export function SoftwareApplicationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'NeoChat',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: 'Automatisez vos ventes sur WhatsApp 24/7 avec l\'IA. Créez votre bot sans coder, envoyez des diffusions ciblées et propulsez votre e-commerce en Afrique.',
    url: 'https://neochat.pro',
    image: 'https://neochat.pro/og-image.png',
    author: {
      '@type': 'Organization',
      name: 'NeoChat',
    },
    offers: [
      {
        '@type': 'Offer',
        name: 'Plan Starter',
        price: '5000',
        priceCurrency: 'XOF',
        priceValidUntil: '2026-12-31',
        availability: 'https://schema.org/InStock',
        url: 'https://neochat.pro/pricing',
      },
      {
        '@type': 'Offer',
        name: 'Plan Pro',
        price: '7500',
        priceCurrency: 'XOF',
        priceValidUntil: '2026-12-31',
        availability: 'https://schema.org/InStock',
        url: 'https://neochat.pro/pricing',
      },
      {
        '@type': 'Offer',
        name: 'Plan Business',
        price: '10000',
        priceCurrency: 'XOF',
        priceValidUntil: '2026-12-31',
        availability: 'https://schema.org/InStock',
        url: 'https://neochat.pro/pricing',
      },
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '127',
      bestRating: '5',
      worstRating: '1',
    },
    featureList: [
      'Bot WhatsApp avec IA',
      'Diffusion anti-spam',
      'Automatisation 24/7',
      'Sans code',
      'Support multi-instances',
    ],
  };

  return (
    <Script
      id="software-application-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function OrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'NeoChat',
    url: 'https://neochat.pro',
    logo: 'https://neochat.pro/logo-neochat.svg',
    description: 'Plateforme SaaS d\'automatisation WhatsApp et Bot IA pour l\'Afrique de l\'Ouest',
    sameAs: [
      'https://twitter.com/neochat',
      'https://facebook.com/neochat',
      'https://linkedin.com/company/neochat',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      availableLanguage: ['French', 'English'],
    },
  };

  return (
    <Script
      id="organization-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function WebPageSchema({ name, description, url }: { name: string; description: string; url: string }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name,
    description,
    url,
    publisher: {
      '@type': 'Organization',
      name: 'NeoChat',
      logo: {
        '@type': 'ImageObject',
        url: 'https://neochat.pro/logo-neochat.svg',
      },
    },
  };

  return (
    <Script
      id="webpage-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function FAQSchema({ faqs }: { faqs: Array<{ question: string; answer: string }> }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <Script
      id="faq-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
