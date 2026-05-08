import { describe, expect, test } from "bun:test";
import { bigramKorean, buildMatchExpr } from "./search-tokens";

describe("bigramKorean", () => {
  test("returns input unchanged for latin/digit/punct only", () => {
    expect(bigramKorean("API spec v1.2")).toBe("API spec v1.2");
    expect(bigramKorean("")).toBe("");
  });

  test("appends bigrams of contiguous Korean runs", () => {
    expect(bigramKorean("넥스트")).toBe("넥스트 넥스 스트");
    expect(bigramKorean("타이탄")).toBe("타이탄 타이 이탄");
  });

  test("treats latin and Korean runs separately", () => {
    expect(bigramKorean("API 명세")).toBe("API 명세 명세");
    expect(bigramKorean("넥스트 타이탄")).toBe(
      "넥스트 타이탄 넥스 스트 타이 이탄",
    );
  });

  test("single-syllable run is preserved as-is in the bigram tail", () => {
    expect(bigramKorean("아 잘 자")).toBe("아 잘 자 아 잘 자");
  });

  test("punctuation breaks runs", () => {
    expect(bigramKorean("넥스트, 타이탄!")).toBe(
      "넥스트, 타이탄! 넥스 스트 타이 이탄",
    );
  });
});

describe("buildMatchExpr", () => {
  test("empty input yields empty expression", () => {
    expect(buildMatchExpr("")).toBe("");
    expect(buildMatchExpr("   ")).toBe("");
  });

  test("single latin token gets quoted", () => {
    expect(buildMatchExpr("api")).toBe('"api"');
  });

  test("multiple tokens are space-joined (implicit AND)", () => {
    expect(buildMatchExpr("api spec")).toBe('"api" "spec"');
  });

  test("Korean term expands to original + bigrams, all quoted", () => {
    // bigramKorean("넥스트") = "넥스트 넥스 스트"
    expect(buildMatchExpr("넥스트")).toBe('"넥스트" "넥스" "스트"');
  });

  test("user-supplied operators are neutralized by quoting", () => {
    expect(buildMatchExpr('foo "bar" -baz')).toBe('"foo" """bar""" "-baz"');
  });
});
