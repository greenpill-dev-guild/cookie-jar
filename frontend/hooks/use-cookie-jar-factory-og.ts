"use client"

// import { useState, useEffect } from "react";
// import {
//   useReadCookieJarFactoryCookieJarMetadata,
//   useReadCookieJarFactoryCookieJars,
// } from "../generated";

// export function useCookieJarData() {
//   const [cookieJarsData, setCookieJarsData] = useState<
//     Array<{ address: string; metadata: string }>
//   >([]);
//   const [error, setError] = useState<Error | null>(null);
//   const [index, setIndex] = useState(0);
//   const [shouldFetchJar, setShouldFetchJar] = useState(true);
//   const [currentJarAddress, setCurrentJarAddress] = useState<
//     `0x${string}` | null
//   >(null);

//   // First query: Get the jar address
//   const {
//     data: jarResponse,
//     isSuccess: isJarSuccess,
//     isLoading: isJarLoading,
//   } = useReadCookieJarFactoryCookieJars({
//     args: [BigInt(index)],
//     address: "0x2B51eDBf0Cb6c7914dc68a2FFb1359A67ED49ACb",
//     query: {
//       enabled: shouldFetchJar,
//     },
//   });

//   const {
//     data: metadataResponse,
//     isSuccess: isMetadataSuccess,
//     isLoading: isMetadataLoading,
//   } = useReadCookieJarFactoryCookieJarMetadata({
//     args: [currentJarAddress!],
//     address: "0x2B51eDBf0Cb6c7914dc68a2FFb1359A67ED49ACb",
//     query: {
//       enabled: !!currentJarAddress, // Only run if we have a jar address
//     },
//   });

//   // Combined loading state
//   const isLoading = isJarLoading || isMetadataLoading;

//   // Update currentJarAddress when jar query succeeds
//   useEffect(() => {
//     if (isJarSuccess && jarResponse) {
//       // Save the jar address for the metadata query
//       setCurrentJarAddress(jarResponse);
//       // Prevent the jar query from running again until we reset
//       setShouldFetchJar(false);
//     }
//   }, [jarResponse, isJarSuccess]);

//   // When metadata query succeeds, save the data and move to next index
//   useEffect(() => {
//     if (isMetadataSuccess && metadataResponse && currentJarAddress) {
//       // Add to our collection
//       setCookieJarsData((prev) => [
//         ...prev,
//         {
//           address: currentJarAddress,
//           metadata: metadataResponse,
//         },
//       ]);

//       // Reset for next jar
//       setCurrentJarAddress(null);
//       setIndex((prevIndex) => prevIndex + 1);
//       setShouldFetchJar(true);
//     }
//   }, [metadataResponse, isMetadataSuccess, currentJarAddress]);

//   return {
//     cookieJarsData,
//     isLoading,
//     error,
//   };
// }
