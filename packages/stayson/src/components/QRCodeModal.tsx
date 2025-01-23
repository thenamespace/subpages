import React, { useEffect } from 'react';
import QrCodeWithLogo from 'qrcode-with-logos';
import { Box, Button, Grid, Image } from '@chakra-ui/react';
import logo from '../assets/logo.png';
import { themeVariables } from "@/styles/themeVariables";

interface QRCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    referralUrl: string;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose, referralUrl }) => {

    useEffect(() => {
        if (isOpen) {
            new QrCodeWithLogo({
                content: referralUrl,
                width: 380,
                image: document.getElementById('image') as HTMLImageElement,
                logo: {
                    src: logo
                }
            });
        }
    }, [isOpen, referralUrl]);

    const handleDownload = () => {
        const image = document.getElementById('image') as HTMLImageElement;
        const link = document.createElement('a');
        link.href = image.src;
        link.download = 'qrcode.png';
        link.click();
    };

    if (!isOpen) return null;

    return (
        <Grid
            position="fixed"
            top="0"
            left="0"
            width="100vw"
            height="100vh"
            backgroundColor="rgba(0, 0, 0, 0.6)"
            justifyContent="center"
            alignItems="center"
            zIndex="10000"
            onClick={onClose}
        >
            <Button
                position="absolute"
                top="20px"
                right="20px"
                onClick={onClose}
                size="sm"
                color={themeVariables.light}
                bg={themeVariables.accent}
            >
                X
            </Button>
            <Box
                position="relative"
                padding="20px"
                onClick={(e) => e.stopPropagation()}
                textAlign="center"
            >
                <Image id="image" alt="QR Code" />
                <Button mt={4} onClick={handleDownload} color={themeVariables.light} bg={themeVariables.accent}>
                    Download QR Code
                </Button>
            </Box>
        </Grid>
    );
};

export default QRCodeModal;