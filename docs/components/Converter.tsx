import {
  CopyIcon,
  ArrowDownIcon,
  ArrowBackIcon,
  ArrowForwardIcon,
  CloseIcon,
} from "@chakra-ui/icons";
import {
  Box,
  Textarea,
  Select,
  FormControl,
  FormErrorMessage,
  IconButton,
  ChakraProvider,
  extendTheme,
  Heading,
} from "@chakra-ui/react";
import React, { useEffect, useMemo, useState } from "react";
import { e, d, b64ToHexString, hexToB64String } from "xsuite/data";

export default function Convert() {
  const [converterStates, setConverterStates] = useState<ConverterState[]>([]);

  const addConverter = (state: Omit<ConverterState, "id">) => {
    newConverterId += 1;
    setConverterStates([...converterStates, { ...state, id: newConverterId }]);
  };

  const changeConverter = (
    id: number,
    state: Partial<Omit<ConverterState, "id">>,
  ) => {
    const dupStates = [...converterStates];
    const i = dupStates.findIndex((s) => s.id === id);
    dupStates.splice(i, 1, { ...dupStates[i], ...state });
    setConverterStates(dupStates);
  };

  const duplicateConverter = (id: number) => {
    newConverterId += 1;
    const dupStates = [...converterStates];
    const i = dupStates.findIndex((s) => s.id === id);
    dupStates.splice(i + 1, 0, {
      ...dupStates[i],
      id: newConverterId,
    });
    setConverterStates(dupStates);
  };

  const moveLeftConverter = (id: number) => {
    const dupStates = [...converterStates];
    const i = dupStates.findIndex((s) => s.id === id);
    if (i > 0) {
      const element = dupStates.splice(i, 1)[0];
      dupStates.splice(i - 1, 0, element);
      setConverterStates(dupStates);
    }
  };

  const moveRightConverter = (id: number) => {
    const dupStates = [...converterStates];
    const i = dupStates.findIndex((s) => s.id === id);
    if (i < dupStates.length) {
      const element = dupStates.splice(i, 1)[0];
      dupStates.splice(i + 1, 0, element);
      setConverterStates(dupStates);
    }
  };

  const deleteConverter = (id: number) => {
    const dupStates = [...converterStates];
    const i = dupStates.findIndex((s) => s.id === id);
    dupStates.splice(i, 1);
    setConverterStates(dupStates);
  };

  useEffect(() => {
    addConverter({
      inputType: "string",
      inputValue: "",
      outputType: "hex",
    });
  }, []);

  return (
    <ChakraProvider
      resetCSS={false}
      theme={extendTheme({
        styles: {
          global: {
            "body, h1, h2, h3, h4, h5, h6": {
              fontFamily: "inherit !important",
              lineHeight: "inherit !important",
            },
          },
        },
      })}
    >
      <Box mb="8" />
      <Heading>Data Converter</Heading>
      <Box mb="8" />
      <Box display="flex" gap="10" flexWrap="wrap">
        {converterStates.map((s) => (
          <ConverterBox
            key={s.id}
            state={s}
            onChangeState={(state) => changeConverter(s.id, state)}
            onDuplicate={() => duplicateConverter(s.id)}
            onMoveLeft={() => moveLeftConverter(s.id)}
            onMoveRight={() => moveRightConverter(s.id)}
            onDelete={() => deleteConverter(s.id)}
          />
        ))}
      </Box>
    </ChakraProvider>
  );
}

const ConverterBox = ({
  state: { inputType, inputValue, outputType },
  onChangeState,
  onDuplicate,
  onMoveLeft,
  onMoveRight,
  onDelete,
}: {
  state: Omit<ConverterState, "id">;
  onChangeState: (state: Partial<Omit<ConverterState, "id">>) => any;
  onDuplicate: () => any;
  onMoveLeft: () => any;
  onMoveRight: () => any;
  onDelete: () => any;
}) => {
  const [outputValue, outputError] = useMemo(() => {
    try {
      return [convert(inputType, inputValue, outputType), false];
    } catch {
      return ["", true];
    }
  }, [inputType, inputValue, outputType]);

  return (
    <Box
      maxW="400px"
      w="100%"
      borderWidth="1px"
      borderRadius="md"
      px="4"
      pt="2"
      pb="4"
      boxShadow="md"
    >
      <Box display="flex" alignItems="left">
        <Box fontSize="lg" fontWeight="bold">
          {dataTypes[inputType]} ➞ {dataTypes[outputType]}
        </Box>
        <Box flex="1" />
        <IconButton
          size="sm"
          variant="ghost"
          aria-label="Duplicate"
          icon={<CopyIcon />}
          onClick={onDuplicate}
        />
        <IconButton
          size="sm"
          variant="ghost"
          aria-label="Move left"
          icon={<ArrowBackIcon />}
          onClick={onMoveLeft}
        />
        <IconButton
          size="sm"
          variant="ghost"
          aria-label="Move right"
          icon={<ArrowForwardIcon />}
          onClick={onMoveRight}
        />
        <IconButton
          size="sm"
          variant="ghost"
          aria-label="Delete"
          icon={<CloseIcon />}
          onClick={onDelete}
        />
      </Box>
      <Box mb="4" />
      <Box display="flex" gap="3" alignItems="center">
        Type
        <Select
          value={inputType}
          onChange={(e) =>
            onChangeState({ inputType: e.currentTarget.value as any })
          }
        >
          {Object.entries(dataTypes).map(([value, name]) => (
            <option key={value} value={value}>
              {name}
            </option>
          ))}
        </Select>
      </Box>
      <Box mb="3" />
      <Box>
        <Textarea
          value={inputValue}
          onChange={(e) => onChangeState({ inputValue: e.currentTarget.value })}
          size="sm"
          placeholder="Input"
        />
      </Box>
      <Box mb="3" />
      <Box display="flex" justifyContent="center">
        <IconButton
          variant="ghost"
          aria-label="Change conversion direction"
          icon={<ArrowDownIcon />}
          isRound
          onClick={() =>
            onChangeState({
              inputType: outputType,
              inputValue: outputValue,
              outputType: inputType,
            })
          }
        />
      </Box>
      <Box mb="3" />
      <Box display="flex" gap="3" alignItems="center">
        Type
        <Select
          value={outputType}
          onChange={(e) =>
            onChangeState({ outputType: e.currentTarget.value as any })
          }
        >
          {Object.entries(dataTypes).map(([value, name]) => (
            <option key={value} value={value}>
              {name}
            </option>
          ))}
        </Select>
      </Box>
      <Box mb="3" />
      <Box>
        <FormControl isInvalid={outputError}>
          <Textarea
            value={outputValue}
            size="sm"
            isDisabled
            opacity="unset !important"
            placeholder="Output"
          />
          {outputError && <FormErrorMessage>Error</FormErrorMessage>}
        </FormControl>
      </Box>
    </Box>
  );
};

const convert = (
  inputType: DataType,
  inputValue: string,
  outputType: DataType,
): string => {
  let hex: string;
  if (inputType === "hex") {
    hex = inputValue;
  } else if (inputType === "base64") {
    hex = b64ToHexString(inputValue);
  } else if (inputType === "biguint") {
    hex = e.U(BigInt(inputValue)).toTopHex();
  } else if (inputType === "string") {
    hex = e.Str(inputValue).toTopHex();
  } else if (inputType === "address") {
    hex = e.Addr(inputValue).toTopHex();
  } else {
    throw "Invalid input type.";
  }
  if (outputType === "hex") {
    return hex;
  } else if (outputType === "base64") {
    return hexToB64String(hex);
  } else if (outputType === "biguint") {
    return d.U().topDecode(hex).toString();
  } else if (outputType === "string") {
    return d.Str().topDecode(hex);
  } else if (outputType === "address") {
    return d.Addr().topDecode(hex);
  } else {
    throw "Invalid output type.";
  }
};

let newConverterId = 1;

const dataTypes = {
  hex: "Hex",
  base64: "Base64",
  string: "String",
  biguint: "BigUint",
  address: "Address",
};

type DataType = keyof typeof dataTypes;

type ConverterState = {
  id: number;
  inputType: DataType;
  inputValue: string;
  outputType: DataType;
};
