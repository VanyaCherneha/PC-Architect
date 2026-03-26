import { useTranslation } from 'react-i18next';
import walterExcited from '../assets/images/walter-excited.png?update=2';
import walterThumbs from '../assets/images/walter-thumbs.png?update=2';
import walterDisappointed from '../assets/images/walter-disappointed.png?update=2';
import walterThinking from '../assets/images/walter-thinking.png?update=2';
import './Walter.css';

const walterImages = {
  excited: walterExcited,
  thumbs: walterThumbs,
  disappointed: walterDisappointed,
  thinking: walterThinking,
};

function Walter({ emotion = 'thinking', size = 'medium', speechBubble = null }) {
  const { t } = useTranslation();
  const imgSrc = walterImages[emotion] || walterThinking;

  return (
    <div className={`walter walter--${size}`}>
      {speechBubble && (
        <div className="walter__speech-bubble">
          <p>{speechBubble}</p>
        </div>
      )}
      <img
        className="walter__avatar"
        src={imgSrc}
        alt={`Walter is ${emotion}`}
      />
      <span className="walter__label">{t('walter.label')}</span>
    </div>
  );
}

export default Walter;
