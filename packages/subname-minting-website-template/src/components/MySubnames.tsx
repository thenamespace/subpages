import {
  Box,
  Button,
  Flex,
  Grid,
  Spinner,
  Text,
  Image,
  Input,
  useBreakpointValue,
} from "@chakra-ui/react";
import { hexToRgba, themeVariables } from "@/styles/themeVariables";
import { useAccount } from "wagmi";
import { useMemo, useState } from "react";
import { SideModal } from "./SideModal";
import { SingleSubname } from "./SingleSubname";
import { ToastContainer } from "react-toastify";
import { useAppConfig } from "./AppConfigContext";
import {
  GenericSubname,
  useSubnames,
} from "./useSubnames";
import noImage from "../assets/no-avatar.png";

interface MySubnamesProps {
  setView: (view: string) => void;
}

export const MySubnames = ({ setView }: MySubnamesProps) => {
  const { listedName, listingType } = useAppConfig();
  const { address } = useAccount();
  const [selectedSubname, setSelectedSubname] = useState<GenericSubname>();
  const { isFetching, items } = useSubnames(listedName, address!, listingType);

  const [searchFilter, setSearchFilter] = useState("");
  const filterApplied = searchFilter.length > 0;

  const allSubnames = useMemo(() => {
    return items.filter((i) => {
      if (searchFilter.length === 0) {
        return true;
      }
      return i.name.includes(searchFilter.toLocaleLowerCase());
    });
  }, [items, searchFilter]);

  const boxWidth = useBreakpointValue({ base: "90%", md: "600px", xs: "100%" });
  const boxPadding = useBreakpointValue({ base: 4, md: 6 });
  const headlineFontSize = useBreakpointValue({ base: "40px", md: "70px" });

  return (
    <Grid
      display="flex"
      flexDirection="column"
      alignItems="flex-start"
      justifyContent="flex-start"
      paddingTop="50px"
      width={"100%"}
    >
      {selectedSubname !== undefined && (
        <SideModal open={true} onClose={() => setSelectedSubname(undefined)}>
          <SingleSubname onUpdate={() => {}} subname={selectedSubname} />
        </SideModal>
      )}
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        mb={10}
        alignSelf="center"
      >
        <Text
          mt={0}
          mb={0}
          color={themeVariables.accent}
          fontSize={headlineFontSize}
          textAlign="center"
          fontWeight="500"
        >
          SUBNAMES
        </Text>
      </Box>
      <Box width={boxWidth} alignSelf="center">
        <Flex justifyContent="space-between" alignItems="center" mb={0}>
          <Text
            color={themeVariables.accent}
            fontSize={24}
            marginLeft="15px"
            mb={0}
          >
            {isFetching ? "" : `Total: ${items.length}`}
          </Text>
          <Input
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder={"Find your subnames"}
            bg={hexToRgba(themeVariables.main, 0.8)}
            borderRadius="5px 5px 0 0"
            width={{ base: "60%", md: "50%" }}
            color={themeVariables.light}
            borderColor={themeVariables.accent}
          />
        </Flex>
      </Box>
      <Box
        overflowY="auto"
        bg={hexToRgba(themeVariables.main, 0.8)}
        p={boxPadding}
        alignSelf="center"
        borderRadius="15px 0 15px 15px"
        shadow="md"
        width={{ base: "90%", md: "600px" }}
        height="400px"
        position="relative"
        border="1px solid"
        borderColor={themeVariables.accent}
      >
        {isFetching && (
          <Flex alignItems="center" justifyContent="center" height="100%">
            <Spinner
              color={themeVariables.accent}
              width={200}
              height={200}
              animationDuration="1.3s"
              borderWidth="3px"
            />
          </Flex>
        )}
        {!isFetching && (
          <>
            {allSubnames.length === 0 && (
              <>
                {!filterApplied && (
                  <Flex
                    height="100%"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text color={themeVariables.accent} fontSize={24} mb={10}>
                      You don't own any subname
                    </Text>
                    <Button
                      onClick={() => setView("mint")}
                      width="50%"
                      color={themeVariables.light}
                      bg={themeVariables.accent}
                    >
                      Register
                    </Button>
                  </Flex>
                )}
                {filterApplied && (
                  <Flex
                    height="100%"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text color={themeVariables.accent} fontSize={24} mb={10}>
                      No subnames with search criteria
                    </Text>
                    <Button
                      onClick={() => setSearchFilter("")}
                      width="50%"
                      color={themeVariables.light}
                      bg={themeVariables.accent}
                    >
                      Clear
                    </Button>
                  </Flex>
                )}
              </>
            )}
            {allSubnames.length > 0 && (
              <>
                {allSubnames
                  .filter((i) => {
                    if (searchFilter.length === 0) {
                      return true;
                    }
                    return i.name.includes(searchFilter.toLocaleLowerCase());
                  })
                  .map((subname, index) => (
                    <Flex
                      onClick={() => setSelectedSubname(subname)}
                      key={subname.name + "-" + index}
                      alignItems="center"
                      p={2}
                      borderBottom="1px solid"
                      borderColor={themeVariables.accent}
                      cursor="pointer"
                      _hover={{
                        backgroundColor: hexToRgba(themeVariables.accent, 0.5),
                      }}
                    >
                      <Image
                        src={subname.texts?.avatar || noImage}
                        width="50px"
                        height="50px"
                        borderRadius="full"
                        outline="2px solid"
                        outlineColor={themeVariables.accent}
                        backgroundColor={themeVariables.dark}
                        cursor="pointer"
                        transition="all 0.5s ease-in-out"
                        _hover={{ transform: "scale(1.3)" }}
                      />
                      <Text
                        fontSize="22px"
                        ml={4}
                        mb={0}
                        color={themeVariables.accent}
                      >
                        {subname.name}
                      </Text>
                    </Flex>
                  ))}
              </>
            )}
          </>
        )}
      </Box>
      <ToastContainer
        toastStyle={{
          backgroundColor: themeVariables.accent,
          color: themeVariables.light,
        }}
        hideProgressBar
      />
    </Grid>
  );
};
