import React from 'react';
import './SoundWave.css';

const SoundWave = ({ state }) => {
  // Create array of bars with different animation delays
  const bars = Array.from({ length: 15 }, (_, i) => i);

  return (
    <div className={`sound-wave ${state}`}>
      {bars.map((bar, index) => (
        <div
          key={index}
          className="wave-bar"
          style={{
            animationDelay: `${index * 50}ms`
          }}
        />
      ))}
    </div>
  );
};

export default SoundWave;
