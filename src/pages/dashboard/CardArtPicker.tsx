import React from 'react';
import { Check, ImageOff, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ART_CHOICES, CUSTOM_ART } from './dashboardArt';

/** What a card shows: nothing, the dashboard's default picture, or one picture by id (CUSTOM_ART = the person's own). */
export type CardArtChoice = 'off' | 'default' | string;

/**
 * Small pop-up in Customize mode: pick the picture for one card. It lists every built-in picture and, when
 * one has been imported, "My picture". "Default" follows whatever is chosen in Settings → Background & Art.
 */
const CardArtPicker: React.FC<{
  isDark: boolean;
  current: CardArtChoice;
  customAvailable: boolean;
  customUrl: string | null;
  onChoose: (choice: CardArtChoice) => void;
}> = ({ isDark, current, customAvailable, customUrl, onChoose }) => {
  const { t } = useTranslation();
  return (
    <div className="bento-art-pop" role="dialog" aria-label={t('Picture for this card')} onPointerDown={e => e.stopPropagation()}>
      <div className="bento-art-pop-row">
        <button type="button" className={`aw-chip${current === 'off' ? ' is-picked' : ''}`} aria-pressed={current === 'off'} onClick={() => onChoose('off')}>
          <ImageOff size={12} style={{ marginRight: 5 }} /> {t('No picture')}
        </button>
        <button type="button" className={`aw-chip${current === 'default' ? ' is-picked' : ''}`} aria-pressed={current === 'default'} onClick={() => onChoose('default')}>
          <Star size={12} style={{ marginRight: 5 }} /> {t('Default picture')}
        </button>
      </div>
      <div className="bento-art-pop-grid">
        {ART_CHOICES.map(a => {
          const url = a.url(isDark);
          const picked = current === a.id;
          return (
            <button key={a.id} type="button" title={a.label} aria-label={a.label} aria-pressed={picked}
              className={`bento-art-thumb${picked ? ' is-picked' : ''}`} style={url ? { backgroundImage: `url("${url}")` } : undefined}
              onClick={() => onChoose(a.id)}>
              {picked && <Check size={14} strokeWidth={3} />}
            </button>
          );
        })}
        {customAvailable && (
          <button type="button" title={t('My picture')} aria-label={t('My picture')} aria-pressed={current === CUSTOM_ART}
            className={`bento-art-thumb${current === CUSTOM_ART ? ' is-picked' : ''}`} style={customUrl ? { backgroundImage: `url("${customUrl}")` } : undefined}
            onClick={() => onChoose(CUSTOM_ART)}>
            {current === CUSTOM_ART && <Check size={14} strokeWidth={3} />}
          </button>
        )}
      </div>
    </div>
  );
};

export default CardArtPicker;
