import { Grid, Link, Text, useBreakpointValue } from "@chakra-ui/react";
import { themeVariables } from "@/styles/themeVariables";

export const Footer = () => {
  const padding = useBreakpointValue({ base: "0 10px", md: "0 20px" });
  const fontSize = useBreakpointValue({ base: "12px", md: "14px" });

  return (
    <Grid
      templateColumns="1fr"
      alignItems="center"
      justifyContent="center"
      p={padding}
      bg="transparent"
      width="100%"
      height="50px"
      zIndex={1000}
    >
      <Text fontSize={fontSize} textAlign="center" mb={0}>
        <Link
          href="https://github.com/thenamespace/subpages"
          target="_blank"
          color={themeVariables.light}
          fontWeight="bold"
          textDecoration="none"
          _hover={{
            textDecoration: "underline",
            textDecorationColor: themeVariables.accent,
          }}
        >
          Built by Namespace 🤝 Create your subpage today
        </Link>
      </Text>
    </Grid>
  );
};
