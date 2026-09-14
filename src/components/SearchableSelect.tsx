"use client";

import React, { useState, useEffect, useRef } from "react";

export interface SearchOption {
  id: number;
  nome: string;
  subtitulo?: string | null;
}

interface SearchableSelectProps {
  label: string;
  options: SearchOption[];
  value: number | "";
  onChange: (id: number) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export function SearchableSelect({
  label,
  options,
  value,
  onChange,
  placeholder = "Digite para pesquisar...",
  required = false,
  disabled = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.id === value);

  // Mantém o texto sincronizado com o item selecionado
  useEffect(() => {
    if (!isOpen) {
      setQuery(selectedOption ? selectedOption.nome : "");
    }
  }, [value, selectedOption, isOpen]);

  // Fecha o menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery(selectedOption ? selectedOption.nome : "");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedOption]);

  // Função auxiliar para remover acentos e facilitar a busca
  function normalizeStr(str: string) {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  const normalizedQuery = normalizeStr(query);

  const filteredOptions = options.filter((opt) => {
    if (!normalizedQuery) return true;
    const nomeNorm = normalizeStr(opt.nome);
    const subNorm = opt.subtitulo ? normalizeStr(opt.subtitulo) : "";
    return nomeNorm.includes(normalizedQuery) || subNorm.includes(normalizedQuery);
  });

  function handleSelect(opt: SearchOption) {
    onChange(opt.id);
    setQuery(opt.nome);
    setIsOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    setQuery("");
    setIsOpen(true);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        handleSelect(filteredOptions[0]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setQuery(selectedOption ? selectedOption.nome : "");
    }
  }

  return (
    <div className="searchable-field" ref={containerRef} style={{ position: "relative", marginBottom: 14 }}>
      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 500,
          color: "#6b6558",
          marginBottom: 5,
        }}
      >
        {label}
      </label>

      {/* Input de busca com ícone de lupa */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          background: "#fff",
          border: isOpen ? "2px solid var(--kraft)" : "1px solid var(--line)",
          transition: "border-color 0.15s ease",
          boxShadow: isOpen ? "0 0 0 2px rgba(169, 116, 79, 0.2)" : "none",
        }}
      >
        {/* Ícone de Lupinha */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 8px 0 10px",
            color: isOpen ? "var(--kraft)" : "#8a8372",
            fontSize: 15,
            pointerEvents: "none",
            userSelect: "none",
          }}
          title="Pesquisar"
        >
          🔍
        </span>

        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => {
            setIsOpen(true);
            inputRef.current?.select();
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          style={{
            width: "100%",
            border: "none",
            outline: "none",
            padding: "9px 6px 9px 0",
            fontSize: 14,
            fontFamily: "inherit",
            color: "var(--ink)",
            background: "transparent",
          }}
        />

        {/* Botão limpar se tiver algo digitado */}
        {query && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              background: "none",
              border: "none",
              color: "#999",
              cursor: "pointer",
              padding: "4px 8px",
              fontSize: 14,
              lineHeight: 1,
            }}
            title="Limpar texto"
          >
            ✕
          </button>
        )}

        {/* Setinha para abrir/fechar */}
        <button
          type="button"
          onClick={() => {
            if (isOpen) {
              setIsOpen(false);
            } else {
              setIsOpen(true);
              inputRef.current?.focus();
            }
          }}
          style={{
            background: "none",
            border: "none",
            color: "#6b6558",
            cursor: "pointer",
            padding: "0 10px",
            fontSize: 12,
            display: "flex",
            alignItems: "center",
          }}
          title="Alternar opções"
        >
          {isOpen ? "▲" : "▼"}
        </button>
      </div>

      {/* Dropdown de Opções */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 2px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid var(--kraft)",
            boxShadow: "0 6px 16px rgba(0,0,0,0.15)",
            zIndex: 999,
            maxHeight: 220,
            overflowY: "auto",
            borderRadius: 2,
          }}
        >
          {filteredOptions.length === 0 ? (
            <div
              style={{
                padding: "12px 14px",
                fontSize: 13,
                color: "#8a8372",
                textAlign: "center",
                fontStyle: "italic",
              }}
            >
              Nenhuma opção encontrada para &ldquo;{query}&rdquo;
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = opt.id === value;
              return (
                <div
                  key={opt.id}
                  onClick={() => handleSelect(opt)}
                  style={{
                    padding: "9px 12px",
                    cursor: "pointer",
                    borderBottom: "1px solid #f0eae0",
                    background: isSelected ? "#F4EDE2" : "transparent",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 13.5,
                    transition: "background 0.1s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "#FAF6EE";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div>
                    <strong style={{ color: isSelected ? "var(--kraft-dark)" : "var(--ink)" }}>
                      {opt.nome}
                    </strong>
                    {opt.subtitulo && (
                      <div style={{ fontSize: 11.5, color: "#8a8372", marginTop: 2 }}>
                        {opt.subtitulo}
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <span
                      style={{
                        color: "var(--route-green)",
                        fontWeight: "bold",
                        fontSize: 14,
                        marginLeft: 8,
                      }}
                    >
                      ✓
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Input invisível para compatibilidade caso haja form validation */}
      <input type="hidden" value={value} required={required} />
    </div>
  );
}
