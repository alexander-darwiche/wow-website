import React, { useState, useEffect} from "react";
import { render } from 'react-dom';
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ChakraProvider } from "@chakra-ui/react";
import Home from "./components/Home";
import Navbar from "./components/Navbar";

function App() {

  return (
    <BrowserRouter>
      <ChakraProvider>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </ChakraProvider>
    </BrowserRouter>
  )
}

const rootElement = document.getElementById("root")
render(<App />, rootElement)
