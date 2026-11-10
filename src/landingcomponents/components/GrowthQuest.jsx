import React from 'react';
import useInView from '../hooks/useInView';
import { useQuest } from '../context/QuestContext';
import { SECTION_AWARDS } from '../data';
import { scrollToId } from '../utils/storage';

export const cx = (...a) => a.filter(Boolean).join(' ');

/* Scroll-reveal wrapper: adds ccgs-reveal + ccgs-in (same animation as the HTML). */
export function Reveal({ as: Tag = 'div', className, children, ...rest }) {
  const [ref, inView] = useInView(0.14);
  return (
    <Tag ref={ref} className={cx(className, 'ccgs-reveal', inView && 'ccgs-in')} {...rest}>
      {children}
    </Tag>
  );
}

/* In-page anchor that scrolls smoothly and doesn't touch react-router. */
export function ScrollLink({ to, className, children, onClick, ...rest }) {
  return (
    <a
      href={'#ccgs-' + to}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        scrollToId('ccgs-' + to);
        if (onClick) onClick(e);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

/* <section> that awards GP the first time it is 30% visible. */
export function AwardSection({ awardId, className, style, children }) {
  const { game } = useQuest();
  const [ref] = useInView(0.3, () => {
    const a = SECTION_AWARDS[awardId];
    if (a && game.once('sec-' + awardId, a.gp, a.t, a.s) && a.badge) game.unlock(a.badge);
  });
  return (
    <section ref={ref} id={'ccgs-' + awardId} className={className} style={style}>
      {children}
    </section>
  );
}
