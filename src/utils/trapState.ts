const trapIdPattern = /^qTrap\d*$/i

export function isTrapStateId(id: string) {
  return trapIdPattern.test(id)
}
