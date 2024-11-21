"use client";

import {
  Box,
  Textarea,
  IconButton,
  ChakraProvider,
  Heading,
  Field,
  defaultSystem,
  Clipboard,
  Input,
  NativeSelect as ChakraNativeSelect,
  Button,
  Link,
} from "@chakra-ui/react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import NextLink from "next/link";
import React, {
  useEffect,
  useMemo,
  Dispatch,
  SetStateAction,
  useRef,
  useState,
} from "react";
import { FaPlus, FaArrowLeft, FaArrowRight, FaArrowDown } from "react-icons/fa";
import { FaXmark } from "react-icons/fa6";
import { LuClipboard } from "react-icons/lu";
import { e, d, B64 } from "xsuite/data";
import { Proxy } from "xsuite/proxy";

export default function PageClient() {
  return (
    <ChakraProvider value={defaultSystem}>
      <QueryClientProvider client={queryClient}>
        <DataConverter />
      </QueryClientProvider>
    </ChakraProvider>
  );
}

const DataConverter = () => {
  const converters = useConverters();
  const [address, setAddress] = useState("");
  const query = useQuery({
    queryKey: ["address", address],
    queryFn: () => proxy.getSerializableAccount(address),
  });
  const addressMainnetState = JSON.stringify(query.data, null, 2);

  return (
    <Box maxW="breakpoint-2xl" mx="auto" px="4">
      <Box mb="4" />
      <Box textAlign="center">
        <Link asChild>
          <NextLink href="/">← Go back to home</NextLink>
        </Link>
      </Box>
      <Box mb="8" />
      <Heading>Converters</Heading>
      <Box mb="8" />
      <Box display="flex" gap="10" flexWrap="wrap">
        {converters.states?.map((s) => (
          <ConverterBox
            key={s.id}
            state={s}
            onChangeState={(state) => converters.change(s.id, state)}
            onDuplicate={() => converters.duplicate(s.id)}
            onMoveLeft={() => converters.moveLeft(s.id)}
            onMoveRight={() => converters.moveRight(s.id)}
            onRemove={() => converters.remove(s.id)}
          />
        ))}
      </Box>
      <Box mb="8" />
      <Heading>Get address mainnet state</Heading>
      <Box mb="8" />
      <Input
        value={address}
        onChange={(e) => setAddress(e.currentTarget.value)}
      />
      <Box mb="8" />
      <Clipboard.Root value={addressMainnetState}>
        <Clipboard.Trigger asChild>
          <Button size="xs" variant="subtle">
            <LuClipboard />
            <Clipboard.Indicator copied="Copied">Copy</Clipboard.Indicator>
          </Button>
        </Clipboard.Trigger>
      </Clipboard.Root>
      <Box mb="8" />
      <Box as="pre" overflow="auto">
        {addressMainnetState}
      </Box>
      <Box mb="8" />
    </Box>
  );
};

const ConverterBox = ({
  state: { inputType, inputValue, outputType },
  onChangeState,
  onDuplicate,
  onMoveLeft,
  onMoveRight,
  onRemove,
}: {
  state: Omit<ConverterState, "id">;
  onChangeState: (state: Partial<Omit<ConverterState, "id">>) => any;
  onDuplicate: () => any;
  onMoveLeft: () => any;
  onMoveRight: () => any;
  onRemove: () => any;
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
        <IconButton size="sm" variant="ghost" onClick={onDuplicate}>
          <FaPlus />
        </IconButton>
        <IconButton size="sm" variant="ghost" onClick={onMoveLeft}>
          <FaArrowLeft />
        </IconButton>
        <IconButton size="sm" variant="ghost" onClick={onMoveRight}>
          <FaArrowRight />
        </IconButton>
        <IconButton size="sm" variant="ghost" onClick={onRemove}>
          <FaXmark />
        </IconButton>
      </Box>
      <Box mb="4" />
      <Box display="flex" gap="3" alignItems="center">
        Type
        <NativeSelect
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
        </NativeSelect>
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
          size="sm"
          rounded="full"
          onClick={() =>
            onChangeState({
              inputType: outputType,
              inputValue: outputValue,
              outputType: inputType,
            })
          }
        >
          <FaArrowDown />
        </IconButton>
      </Box>
      <Box mb="3" />
      <Box display="flex" gap="3" alignItems="center">
        Type
        <NativeSelect
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
        </NativeSelect>
      </Box>
      <Box mb="3" />
      <Box>
        <Field.Root invalid={outputError}>
          <Textarea
            value={outputValue}
            size="sm"
            disabled
            opacity="unset !important"
            placeholder="Output"
          />
          {outputError && <Field.ErrorText>Error</Field.ErrorText>}
        </Field.Root>
      </Box>
    </Box>
  );
};

const NativeSelect = ({
  value,
  onChange,
  children,
  ...props
}: Omit<ChakraNativeSelect.RootProps, "value" | "onChange" | "children"> &
  Pick<ChakraNativeSelect.FieldProps, "value" | "onChange" | "children">) => {
  return (
    <ChakraNativeSelect.Root {...props}>
      <ChakraNativeSelect.Field {...{ value, onChange, children }} />
      <ChakraNativeSelect.Indicator />
    </ChakraNativeSelect.Root>
  );
};

const useConverters = () => {
  const [states, setStates] = useLocalStorage<ConverterState[]>(
    "converterStates",
    [],
  );

  const add = (state: Omit<ConverterState, "id">) => {
    if (states === undefined) return;
    setStates([...states, { ...state, id: genId() }]);
  };

  const change = (id: number, state: Partial<Omit<ConverterState, "id">>) => {
    if (states === undefined) return;
    const dupStates = [...states];
    const i = dupStates.findIndex((s) => s.id === id);
    dupStates.splice(i, 1, { ...dupStates[i], ...state });
    setStates(dupStates);
  };

  const duplicate = (id: number) => {
    if (states === undefined) return;
    const dupStates = [...states];
    const i = dupStates.findIndex((s) => s.id === id);
    dupStates.splice(i + 1, 0, { ...dupStates[i], id: genId() });
    setStates(dupStates);
  };

  const moveLeft = (id: number) => {
    if (states === undefined) return;
    const dupStates = [...states];
    const i = dupStates.findIndex((s) => s.id === id);
    if (i > 0) {
      const element = dupStates.splice(i, 1)[0];
      dupStates.splice(i - 1, 0, element);
      setStates(dupStates);
    }
  };

  const moveRight = (id: number) => {
    if (states === undefined) return;
    const dupStates = [...states];
    const i = dupStates.findIndex((s) => s.id === id);
    if (i < dupStates.length) {
      const element = dupStates.splice(i, 1)[0];
      dupStates.splice(i + 1, 0, element);
      setStates(dupStates);
    }
  };

  const remove = (id: number) => {
    if (states === undefined) return;
    const dupStates = [...states];
    const i = dupStates.findIndex((s) => s.id === id);
    dupStates.splice(i, 1);
    setStates(dupStates);
  };

  useEffect(() => {
    if (states?.length === 0) {
      add({
        inputType: "string",
        inputValue: "",
        outputType: "hex",
      });
    }
  }, [states]);

  return {
    states,
    add,
    change,
    duplicate,
    moveLeft,
    moveRight,
    remove,
  };
};

function useLocalStorage<T>(
  key: string,
  defaultValue: T,
): [T | undefined, Dispatch<SetStateAction<T | undefined>>] {
  const isMounted = useRef(false);
  const [value, setValue] = useState<T>();

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        setValue(JSON.parse(item));
      } else {
        setValue(defaultValue);
      }
    } catch (e) {
      console.log(e);
    }
    return () => {
      isMounted.current = false;
    };
  }, [key]);

  useEffect(() => {
    if (isMounted.current) {
      window.localStorage.setItem(key, JSON.stringify(value));
    } else {
      isMounted.current = true;
    }
  }, [key, value]);

  return [value, setValue];
}

const convert = (
  inputType: DataType,
  inputValue: string,
  outputType: DataType,
): string => {
  let hex: string;
  if (inputType === "hex") {
    hex = inputValue;
  } else if (inputType === "base64") {
    hex = e.Buffer(B64(inputValue)).toTopHex();
  } else if (inputType === "bytes") {
    hex = e.Buffer(JSON.parse(inputValue)).toTopHex();
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
    return d.Buffer().toHex().fromTop(hex);
  } else if (outputType === "base64") {
    return d.Buffer().toB64().fromTop(hex);
  } else if (outputType === "bytes") {
    const bytes = d.Buffer().fromTop(hex);
    return "[" + Array.from(bytes).join(", ") + "]";
  } else if (outputType === "biguint") {
    return d.U().toStr().fromTop(hex);
  } else if (outputType === "string") {
    return d.Str().fromTop(hex);
  } else if (outputType === "address") {
    return d.Addr().fromTop(hex);
  } else {
    throw "Invalid output type.";
  }
};

const genId = () => Math.random();

const queryClient = new QueryClient();

const proxy = Proxy.newMainnet();

const dataTypes = {
  hex: "Hex",
  base64: "Base64",
  bytes: "Bytes",
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
