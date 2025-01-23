import { ReactElement, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Box, Button, Flex } from "@chakra-ui/react";
import { hexToRgba, themeVariables } from "@/styles/themeVariables";

export const SideModal = (props: {
  open: boolean;
  onClose?: () => void;
  children?: ReactElement
}) => {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
      setIsClient(true);
    }, []);
  
    if (!isClient || !props.open) {
      return null;
    }

    return createPortal(
      <Box
        position="fixed"
        top="0"
        right={props.open ? "0" : "-100%"}
        height="100vh"
        width={{ base: "400px", md: "600px" }}
        boxShadow="lg"
        zIndex="10000000"
        bg={hexToRgba(themeVariables.main, 0.95)}
        color={themeVariables.light}
        border="1px solid"
        borderColor={themeVariables.accent}
        transition="right 0.3s ease-in-out"
        overflowY="auto"
      >
        <Flex p="4" justifyContent="center">
          <Button onClick={() => props.onClose?.()} background={themeVariables.accent} paddingLeft={8} paddingRight={8} >Close</Button>
        </Flex>
        <Box p="4">
          {props.children}
        </Box>
      </Box>,
      document.body
    );
};