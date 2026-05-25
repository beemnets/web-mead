'use client';

import { useReveal } from '@/hooks/useReveal';
import SectionTitle from '@/components/landing/ui/SectionTitle';
import { IconMapPin, IconClock, IconPhone, IconMail } from '@/components/landing/ui/Icons';

export default function LocationSection() {
  const reveal = useReveal();

  return (
    <section className="py-24 md:py-32 px-6 bg-gray-50/50">
      <div className="max-w-7xl mx-auto">
        <SectionTitle eyebrow="Visit Us" title="Our Location"
          subtitle="Located at Woldia University, we welcome members during business hours." />

        <div className="grid lg:grid-cols-5 gap-8 items-stretch">
          {/* Map */}
          <div ref={reveal.ref} className={`lg:col-span-3 rounded-2xl overflow-hidden shadow-xl border border-gray-100 h-[400px] lg:h-auto ${reveal.revealed ? 'revealed' : ''} reveal-left relative`}>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3921.5!2d39.6047!3d11.8333!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x164aad2da50e2621%3A0xb4e2b3c4d5e6f7a8!2sWoldia%20University!5e0!3m2!1sen!2set!4v1716000000000!5m2!1sen!2set"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Woldia University — Africa, Ethiopia, Woldia"
            />
            {/* Breadcrumb location label */}
            <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-[#0A2E5C] text-xs font-semibold px-3 py-1.5 rounded-lg shadow-md flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-[#0A2E5C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Africa &rsaquo; Ethiopia &rsaquo; Woldia &rsaquo; Woldia University
            </div>
            {/* Direct link overlay */}
            <a
              href="https://maps.app.goo.gl/Xua49pgGQfUcx4dQ8"
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-3 right-3 bg-white text-[#0A2E5C] text-xs font-semibold px-3 py-1.5 rounded-lg shadow-md hover:bg-[#0A2E5C] hover:text-white transition-all flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              View on Google Maps
            </a>
          </div>

          {/* Info cards */}
          <div className={`lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 ${reveal.revealed ? 'revealed' : ''} reveal-right`}>
            {[
              { icon: <IconMapPin className="w-5 h-5" />, title: 'Main Office', lines: ['Woldia, Ethiopia', 'Woldia University Compound', 'Zone 3, North Wollo'] },
              { icon: <IconClock className="w-5 h-5" />, title: 'Office Hours', lines: ['Monday – Friday', '8:00 AM – 5:00 PM'] },
              { icon: <IconPhone className="w-5 h-5" />, title: 'Phone', lines: ['+251 14 313 141', 'Weekdays 9AM–4PM'] },
              { icon: <IconMail className="w-5 h-5" />, title: 'Email', lines: ['info@maedcoop.et', '24-hour response'] },
            ].map((card, i) => (
              <div key={i} className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1"
                style={{ transitionDelay: `${i * 0.1}s` }}>
                <div className="w-10 h-10 rounded-xl bg-[#E0F2FE] flex items-center justify-center text-[#0A2E5C] mb-4">
                  {card.icon}
                </div>
                <h4 className="font-bold text-gray-900 mb-2 text-sm" style={{ fontFamily: 'Poppins' }}>{card.title}</h4>
                {card.lines.map((l, j) => (
                  <p key={j} className={`text-sm ${j === 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>{l}</p>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
