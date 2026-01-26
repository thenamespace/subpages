'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from './Modal';
import { Button } from './Button';
import { Text } from './Text';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  mintedName: string;
  onSetPrimaryName: () => void;
}

export function SuccessModal({
  isOpen,
  onClose,
  mintedName,
  onSetPrimaryName,
}: SuccessModalProps) {
  const router = useRouter();
  const [showConfetti, setShowConfetti] = useState(false);

  // Trigger confetti animation on open
  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      // Stop confetti after a few seconds
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleViewProfile = () => {
    const label = mintedName.split('.')[0];
    router.push(`/name/${label}`);
    onClose();
  };

  const handleMyNames = () => {
    router.push('/my-names');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton={false}>
      <div className="flex flex-col items-center gap-6 py-4 text-center">
        {/* Confetti Animation */}
        {showConfetti && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="confetti-piece"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  backgroundColor: [
                    '#E91E8D',
                    '#FFB5D8',
                    '#F8B4D9',
                    '#E8D4F0',
                    '#FF69B4',
                  ][Math.floor(Math.random() * 5)],
                }}
              />
            ))}
          </div>
        )}

        {/* Success Icon */}
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brand-pinkBtn to-brand-lavender shadow-lg shadow-brand-accent/20">
          <svg
            className="h-10 w-10 text-brand-accent"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        {/* Success Text */}
        <div>
          <Text as="h2" size="2xl" weight="bold">
            Congratulations!
          </Text>
          <Text size="sm" color="gray" className="mt-2">
            You have successfully registered
          </Text>
          <Text size="lg" weight="bold" color="orange" className="mt-1">
            {mintedName}
          </Text>
        </div>

        {/* Actions */}
        <div className="flex w-full flex-col gap-3">
          <Button onClick={onSetPrimaryName} className="w-full">
            Set as Primary Name
          </Button>
          <Button variant="secondary" onClick={handleViewProfile} className="w-full">
            View Profile
          </Button>
          <Button variant="ghost" onClick={handleMyNames} className="w-full">
            Go to My Names
          </Button>
        </div>
      </div>
    </Modal>
  );
}
