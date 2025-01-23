import { Grid, Link, Text } from "@chakra-ui/react";
import { themeVariables } from "@/styles/themeVariables";

export const Footer = () => {
  return (
    <Grid
      templateColumns="1fr"
      alignItems="center"
      justifyContent="center"
      p="0 20px"
      bg="transparent"
      width="100%"
      height="50px"
      zIndex={1000}
    >
      <Text fontSize="14px" textAlign="center" mb={0}>
        <Link href="https://www.namespace.ninja" target="_blank" color={themeVariables.light} fontWeight="bold" textDecoration="none" _hover={{ textDecoration: "underline", textDecorationColor: themeVariables.accent }}>
          Built by Namespace 🤝 Create your subpage today
        </Link>
      </Text>
    </Grid>
  );
};