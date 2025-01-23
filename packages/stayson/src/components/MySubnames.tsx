import { Box, Button, Flex, Grid, Spinner, Text, Image, Input } from "@chakra-ui/react";
import { hexToRgba, themeVariables } from "@/styles/themeVariables";
import { Subname } from "./Types";
import { AppEnv } from "@/environment";
import axios from "axios";
import { LISTEN_NAME } from "./useNamespaceClient";
import { useAccount, useSignMessage } from "wagmi";
import { useEffect, useMemo, useState } from "react";
import { SideModal } from "./SideModal";
import { SingleSubname } from "./SingleSubname";
import { generateCode } from "@/api/api";
import { generateAuthToken } from "@/api/siwe";
import { useReferral } from "./ReferralContext";
import { toast, ToastContainer } from "react-toastify";
import QRCodeModal from "./QRCodeModal";


const indexerUrl = AppEnv.indexerUrl;
const frontendUrl = AppEnv.frontendUrl;

const fetchSubnames = async (owner: string) => {
  const { data } = await axios.get<{
    items: Subname[];
    totalItems: number;
  }>(`${indexerUrl}`, {
    params: {
      owner,
      parentName: LISTEN_NAME.fullName,
    },
  });
  return data;
};



interface MySubnamesProps {
  setView: (view: string) => void;
}

export const MySubnames = ({ setView }: MySubnamesProps) => {


    const [isQRCodeModalOpen, setQRCodeModalOpen] = useState(false);

    const { address } = useAccount();
    const { signMessageAsync } = useSignMessage();
    const [selectedSubname, setSelectedSubname] = useState<Subname>();
    const [searchFilter, setSearchFilter] = useState("");
    const [subnames, setSubnames] = useState<{
        fetching: boolean;
        items: Subname[];
        totalItems: number;
    }>({
        fetching: true,
        items: [],
        totalItems: 0,
    });

    const { referralCode, setReferralCode } = useReferral();

    useEffect(() => {
        if (!address) {
        return;
        }

        fetchSubnames(address).then((res) => {
            setSubnames({
                fetching: false,
                items: res.items,
                totalItems: res.totalItems,
            });
        });
    }, [address]);

    const refreshSubnames = async () => {
        fetchSubnames(address!!).then((res) => {
            setSubnames({
                fetching: false,
                items: res.items,
                totalItems: res.totalItems,
            });
        });
    };

    let sbnms: Subname[] = [];
    for (let i = 0; i < 10; i++) {
        sbnms = [...sbnms, ...subnames.items];
    }
    const filterApplied = searchFilter.length > 0;

    const allSubnames = useMemo(() => {
        return subnames.items.filter(i => {
        if (searchFilter.length === 0) {
            return true;
        }
        return i.name.includes(searchFilter.toLocaleLowerCase());;
        })    
    },[subnames, searchFilter])




    const getReferralLink = async () => {
        try {
            if (!address) {
                return;
            }
            const authToken = await generateAuthToken(
                address,
                "Generate Referral Code",
                signMessageAsync
            );
    
            const referralCode = await generateCode(authToken);
            setReferralCode(referralCode);
            return referralCode;
        } catch (err) {
            console.log(err);
            return "";
        }
    }



    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            toast("Referral link copied!", {position: "top-right", closeButton: false, autoClose: 1500});
        });
    };





    return (
        <Grid display="flex" flexDirection="column" alignItems="flex-start" justifyContent="flex-start" paddingTop="50px">
            {selectedSubname !== undefined && (
                <SideModal open={true} onClose={() => setSelectedSubname(undefined)}>
                    <SingleSubname onUpdate={() => refreshSubnames()} subname={selectedSubname} />
                </SideModal>
            )}
            <Box display="flex" flexDirection="column" alignItems="center" mb={10} alignSelf="center">
              <Text mt={0} mb={0} color={themeVariables.accent} fontSize="70px" textAlign="center" fontWeight="500">
                SUBNAMES
              </Text>
            </Box>
            <Box width={{ base: "90%", md: "600px" }} alignSelf="center">
                <Flex justifyContent="space-between" alignItems="center" mb={0}>
                    <Text color={themeVariables.accent} fontSize={24} marginLeft="15px" mb={0}>
                        {subnames.fetching ? "" : `Total: ${allSubnames.length}`}
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
            <Box bg={hexToRgba(themeVariables.main, 0.8)} p={6} alignSelf="center" borderRadius="15px 0 15px 15px" shadow="md" width={{ base: "90%", md: "600px" }} height="400px" position="relative" border="1px solid" borderColor={themeVariables.accent}>
                {subnames.fetching && (
                    <Flex alignItems="center" justifyContent="center" height="100%">
                        <Spinner color={themeVariables.accent} width={200} height={200} animationDuration="1.3s" borderWidth="3px"/>
                    </Flex>
                )}
                {!subnames.fetching && (
                    <>
                        {allSubnames.length === 0 && (
                            <>
                                {!filterApplied &&
                                    <Flex height="100%" flexDirection="column" alignItems="center" justifyContent="center">
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
                                }
                                {filterApplied &&
                                    <Flex height="100%" flexDirection="column" alignItems="center" justifyContent="center">
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
                                }
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
                                    _hover={{ backgroundColor: hexToRgba(themeVariables.accent, 0.5) }}
                                    >
                                    <Image
                                        src={subname.texts["avatar"]}
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
                                    <Text fontSize="22px" ml={4} mb={0} color={themeVariables.accent}>
                                        {subname.name}
                                    </Text>
                                    </Flex>
                                ))}
                            </>
                        )}
                    </>
                )}
            </Box>
            {!subnames.fetching && subnames.totalItems > 0 && (
                <Box alignSelf="center" marginTop="20px">
                    {referralCode.length == 0 && (
                        <Button
                            onClick={() => {
                                getReferralLink();
                            }}
                            color={themeVariables.light}
                            bg={themeVariables.accent}
                        >
                            Get Referral Link
                        </Button>
                    )}
                    {referralCode.length > 0 && (
                        <>
                            <Button
                                onClick={() => copyToClipboard(`${frontendUrl}?referral=${referralCode}`)}
                                color={themeVariables.light}
                                bg={themeVariables.accent}
                            >
                                Copy Referral Link to Clipboard
                            </Button>
                            <Button
                                onClick={() => setQRCodeModalOpen(true)}
                                color={themeVariables.light}
                                bg={themeVariables.accent}
                                ml={4}
                            >
                                Show QR Code
                            </Button>
                      </>
                    )}
                </Box>
            )}
            <ToastContainer toastStyle={{ backgroundColor: themeVariables.accent, color: themeVariables.light}} hideProgressBar/>
            <QRCodeModal isOpen={isQRCodeModalOpen} onClose={() => setQRCodeModalOpen(false)} referralUrl={`${frontendUrl}?referral=${referralCode}`} />
        </Grid>
    );
}